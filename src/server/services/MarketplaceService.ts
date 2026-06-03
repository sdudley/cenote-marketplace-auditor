import { inject, injectable } from 'inversify';
import axios from 'axios';
import { Readable } from 'stream';
import {
    InitiateAsyncLicense,
    InitiateAsyncLicenseCollection,
    PricingData,
    StatusAsyncTransactionCollection,
} from '#common/types/marketplace';
import { components as v3Components, paths as v3Paths } from '#common/types/marketplace-v3-api';
import { components as commerceComponents } from '#common/types/commerce-api';
import { TYPES } from '../config/types';
import { ConfigDao } from '../database/dao/ConfigDao';
import { ConfigKey } from '#common/types/configItem';
import { CloudOrServer, LiveOrPending } from '#server/services/types';

type ListingResponse = v3Paths["/rest/3/product-listing/developer-space/{developerId}"]["get"]["responses"]["200"]["content"]["application/json"];

export interface OurPricingItem {
    /**
     * Format: int32
     * @description The time period that this pricing is for: 1 for monthly, 12 for annual
     */
    monthsValid: number;
    /**
     * Format: float
     * @description The amount (in USD) that a customer pays for a license at this tier
     */
    amount: number;
    /**
     * Format: int32
     * @description The user count (or other unit if appropriate, such as remote agents in Bamboo) defining this pricing tier; -1 for unlimited
     */
    unitCount: number;
};

export interface OurPricingData {
    items: OurPricingItem[];
    perUnitItems?: OurPricingItem[];
    expertDiscountOptOut: boolean;
}

@injectable()
export class MarketplaceService {
    private readonly baseUrl = 'https://marketplace.atlassian.com';
    private readonly baseUrlV3 = 'https://api.atlassian.com/marketplace/rest/3';
    private readonly commerceBaseUrl = 'https://api.atlassian.com/commerce/api/v2';
    private username: string = '';
    private password: string = '';
    private vendorId: string = '';
    private developerId: string = '';

    constructor(
        @inject(TYPES.ConfigDao) private readonly configDao: ConfigDao
    ) {}

    private async initializeConfig(): Promise<void> {
        this.username = await this.configDao.get<string>(ConfigKey.AtlassianAccountUser) || '';
        this.password = await this.configDao.get<string>(ConfigKey.AtlassianAccountApiToken) || '';
        this.vendorId = await this.configDao.get<string>(ConfigKey.AtlassianVendorId) || '';
        this.developerId = await this.configDao.get<string>(ConfigKey.AtlassianDeveloperId) || '';
    }

    /**
     * Resolves developer ID from vendor ID via Marketplace V3 developer-space API.
     */
    async fetchDeveloperIdByVendorId(vendorId: string): Promise<string> {
        const url = `${this.baseUrl}/rest/3/developer-space/vendor/${vendorId}`;
        console.log(`Calling Marketplace API: ${url}`);

        const response = await axios.get<v3Components['schemas']['DeveloperId']>(url, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        return response.data.developerId;
    }

    /**
     * If a vendor ID is configured but developer ID is not, fetch and persist the developer ID.
     */
    async migrateDeveloperIdFromVendorIdIfNeeded(): Promise<void> {
        const vendorId = await this.configDao.get<string>(ConfigKey.AtlassianVendorId);
        const developerId = await this.configDao.get<string>(ConfigKey.AtlassianDeveloperId);

        if (!vendorId?.trim() || developerId?.trim()) {
            return;
        }

        const username = await this.configDao.get<string>(ConfigKey.AtlassianAccountUser);
        const apiToken = await this.configDao.get<string>(ConfigKey.AtlassianAccountApiToken);
        if (!username?.trim() || !apiToken?.trim()) {
            console.warn(
                'Atlassian vendor ID is configured but developer ID is missing; ' +
                'cannot resolve developer ID without account credentials.'
            );
            return;
        }

        try {
            const resolvedDeveloperId = await this.fetchDeveloperIdByVendorId(vendorId.trim());
            await this.configDao.set(ConfigKey.AtlassianDeveloperId, resolvedDeveloperId);
            this.developerId = resolvedDeveloperId;
            console.log(`Resolved and saved Atlassian developer ID for vendor ID ${vendorId}`);
        } catch (error) {
            console.error('Failed to resolve Atlassian developer ID from vendor ID:', error);
        }
    }

    private async getAuthHeader(): Promise<string> {
        await this.initializeConfig();
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return `Basic ${credentials}`;
    }

    private buildUrlWithParams(baseUrl: string, params: Record<string, any>): string {
        const queryString = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                queryString.append(key, value.toString());
            }
        });
        return `${baseUrl}?${queryString.toString()}`;
    }

    private async pollForCompletion<T>(
        baseUrl: string,
        statusLink: string,
        downloadLink: string,
        checkStatus: (data: any) => string
    ): Promise<string> {
        let status = 'IN_PROGRESS';
        let resultUrl: string | undefined;

        while (status === 'IN_PROGRESS' || status === 'QUEUED') {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls

            const statusResponse = await axios.get<T>(baseUrl + statusLink, {
                headers: {
                    'Authorization': await this.getAuthHeader()
                }
            });

            status = checkStatus(statusResponse.data);
            if (status === 'COMPLETED') {
                resultUrl = baseUrl + downloadLink;
            } else if (status === 'FAILED') {
                throw new Error(`Export failed: ${statusResponse.data}`);
            }
        }

        if (!resultUrl) {
            throw new Error('No result URL available after export completion');
        }

        return resultUrl;
    }

    private async getStreamForResultUrl(resultUrl: string): Promise<Readable> {
        const response = await axios.get(resultUrl, {
            responseType: 'stream',
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });
        return response.data as Readable;
    }

    /**
     * Start transaction export and return a stream of the JSON array. Caller must consume and destroy the stream.
     */
    async getTransactionsStream(): Promise<Readable> {
        await this.initializeConfig();
        const exportUrl = this.buildUrlWithParams(
            `${this.baseUrlV3}/reporting/developer-space/${this.developerId}/sales/transactions/async/export`,
            { excludeZeroTransactions: false, includeManualInvoice: true }
        );
        console.log(`Calling Marketplace API: ${exportUrl}`);

        const exportResponse = await axios.post<v3Components["schemas"]["Reports_InitiateAsyncExportTransactions"]>(
            exportUrl,
            {},
            { headers: { 'Authorization': await this.getAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const resultUrl = await this.pollForCompletion<StatusAsyncTransactionCollection>(
            this.baseUrlV3,
            exportResponse.data._links.status.href,
            exportResponse.data._links.download.href,
            (data) => data.export.status
        );

        console.log(`Streaming transactions from API`);
        return this.getStreamForResultUrl(resultUrl);
    }

    /**
     * Start both license exports and return streams of the JSON arrays (one per date range). Caller must consume and destroy the streams.
     */
    async getLicensesStreams(): Promise<Readable[]> {
        await this.initializeConfig();
        const streams: Readable[] = [];

        const licenseExportUrl = `${this.baseUrlV3}/reporting/developer-space/${this.developerId}/licenses/async/export`;

        const firstExportUrl = this.buildUrlWithParams(
            licenseExportUrl,
            { startDate: '2010-01-01', endDate: '2018-06-30', includeAtlassianLicenses: true }
        );
        console.log(`Calling Marketplace API: ${firstExportUrl}`);

        const firstExportResponse = await axios.post<v3Components["schemas"]["Reports_InitiateAsyncExportLicenses"]>(
            firstExportUrl,
            {},
            { headers: { 'Authorization': await this.getAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const firstResultUrl = await this.pollForCompletion<InitiateAsyncLicense>(
            this.baseUrlV3,
            firstExportResponse.data._links.status.href,
            firstExportResponse.data._links.download.href,
            (data) => data.export.status
        );

        console.log(`Streaming licenses (batch 1) from API`);
        const stream1 = await this.getStreamForResultUrl(firstResultUrl)

        const secondExportUrl = this.buildUrlWithParams(
            licenseExportUrl,
            { startDate: '2018-07-01', withDataInsights: true, includeAtlassianLicenses: true }
        );
        console.log(`Calling Marketplace API: ${secondExportUrl}`);

        const secondExportResponse = await axios.post<InitiateAsyncLicenseCollection>(
            secondExportUrl,
            {},
            { headers: { 'Authorization': await this.getAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const secondResultUrl = await this.pollForCompletion<InitiateAsyncLicense>(
            this.baseUrlV3,
            secondExportResponse.data._links.status.href,
            secondExportResponse.data._links.download.href,
            (data) => data.export.status
        );

        console.log(`Streaming licenses (batch 2) from API`);
        const stream2 = await this.getStreamForResultUrl(secondResultUrl);

        // Push in reverse order so that we process the newer licenses (with attribution data)
        // first, to work around MP-557 by ensuring that if there are duplicates, we always process
        // first the one with attribution data.

        streams.push(stream2);
        streams.push(stream1);

        return streams;
    }

    private mapCloudOrServerToHostingType(cloudOrServer: CloudOrServer): string|undefined {
        return cloudOrServer === 'cloud' ? 'CLOUD'
            : cloudOrServer === 'server' ? 'SERVER'
            : cloudOrServer === 'datacenter' ? 'DATACENTER'
            : undefined;
    }

    async getPricing(
        addonKey: string,
        productId: string|undefined,
        cloudOrServer: CloudOrServer,
        liveOrPending: LiveOrPending
    ): Promise<OurPricingData|undefined> {
        if (!productId) {
            throw new Error('Product ID is required');
        }

        await this.initializeConfig();

        const offeringsUrl = this.buildUrlWithParams(`${this.commerceBaseUrl}/products/${productId}/offerings`, {
            status: liveOrPending === 'live' ? 'ACTIVE' : 'DRAFT',
            'hosting-type': this.mapCloudOrServerToHostingType(cloudOrServer)
        });
        console.log(`Calling Marketplace API: ${offeringsUrl}`);

        const offeringsResponse = await axios.get<commerceComponents["schemas"]["Offerings_PaginatedResponsePublicOfferingResponse"]>(offeringsUrl, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        let newResult : OurPricingData|undefined = undefined;
        let tenUserItem : OurPricingItem|undefined = undefined;

        for (const offering of offeringsResponse.data.values) {
            const { id } = offering;

            // Supported offering names: See https://developer.atlassian.com/platform/marketplace/marketplace-app-pricing-api/

            if (offering.name !== 'Standard' && offering.name !== 'Data Center') {
                // console.log(`Skipping offering because it is not Standard or Data Center: ${offering.name}`);
                continue;
            }

            // console.log('--------------------------------');
            // console.log(`OFFERING FOUND: ${offering.name}:`);
            // console.dir(offering);

            const pricingPlansUrl = this.buildUrlWithParams(`${this.commerceBaseUrl}/offerings/${id}/pricing-plans`,
                { 'page-size': 50 }
            );

            console.log(`Calling Marketplace API: ${pricingPlansUrl}`);
            const pricingPlansResponse = await axios.get<commerceComponents["schemas"]["Offerings_PaginatedResponsePublicPricingPlanResponse"]>(pricingPlansUrl, {
                headers: {
                    'Authorization': await this.getAuthHeader()
                }
            });

            // console.log(`Pricing plans found for offering ${id} (${offering.name}): `, pricingPlansResponse.data.values.map(pp => pp.description));
            // console.dir('***Raw pricing plan response:')
            // console.dir(pricingPlansResponse.data);

            const commercialPricingPlans = pricingPlansResponse.data.values.filter(pp => pp.currency === 'USD' && pp.type==='COMMERCIAL');

            for (const commercialPricingPlan of commercialPricingPlans) {
                // console.log('Commercial pricing plan found:');
                // console.dir(commercialPricingPlan);

                const tiers = commercialPricingPlan.items[0].tiers;
                // console.log('Tiers found:');
                // console.dir(tiers);

                const cycleType = commercialPricingPlan.items[0].cycle.name;
                if (cycleType==='ANNUAL') {
                    newResult = {
                        expertDiscountOptOut: true, // TODO FIXME FIGURE OUT HOW TO SET THIS PROPERLY WITH V.3 API
                        items: tiers
                            .map(tier => ({
                                monthsValid: 12,
                                amount: tier.flatAmount ? Math.floor(tier.flatAmount / 100) : 0,
                                unitCount: tier.ceiling ?? -1
                            }))
                            // sort -1 as highest, but otherwise ascending
                            .sort((a, b) => (a.unitCount === -1 ? 1 : b.unitCount === -1 ? -1 : a.unitCount - b.unitCount)),
                        perUnitItems: undefined
                    }
                } else if (cycleType==='MONTHLY') {
                    const tenUserTier = tiers.find(tier => tier.ceiling === 10)

                    if (tenUserTier) {
                        tenUserItem = {
                            monthsValid: 1,
                            amount: tenUserTier.flatAmount ? Math.floor(tenUserTier.flatAmount / 100) : 0,
                            unitCount: 10
                        };
                    }
                }
            }
        }

        if (newResult && tenUserItem) {
            newResult.items = [tenUserItem, ...newResult.items];
        }

        return newResult;

        /*
        // Legacy V.2 API request

        const url = `${this.baseUrl}/rest/2/addons/${addonKey}/pricing/${cloudOrServer}/${liveOrPending}`;
        console.log(`Calling Marketplace API: ${url}`);

        const response = await axios.get<PricingData>(url, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        const lr = response.data;

        const result = {
            expertDiscountOptOut: lr.expertDiscountOptOut,
            items: lr.items.map(item => ({
                monthsValid: item.monthsValid,
                amount: item.amount,
                unitCount: item.unitCount
            })),
            perUnitItems: lr.perUnitItems?.map(item => ({
                monthsValid: item.monthsValid,
                amount: item.amount,
                unitCount: item.unitCount
            }))
        };

        console.log('Legacy pricing data:')
        console.dir(result);
        return result;
        */
    }

    async getVendorSpecificAddons(): Promise<{ key: string; name: string; productId: string; }[]> {
        await this.initializeConfig();
        const url = this.buildUrlWithParams(
            `${this.baseUrlV3}/product-listing/developer-space/${this.developerId}`,
            { limit: 50 }
        );
        console.log(`Calling Marketplace API: ${url}`);

        const response = await axios.get<ListingResponse>(url, {
            headers: {
                'Authorization': await this.getAuthHeader(),
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
            }
        });

        if (response.data.links.next) {
            throw new Error('Pagination not supported yet: maximum number of registered apps exceeded');
        }

        return response.data.items.map(item => ({ key: item.appKey, name: item.appName, productId: item.productId }));
    }

    async getParentProductForAddon(appKey: string): Promise<string|undefined> {
        await this.initializeConfig();

        // Convert the appKey to the softwareId (which is somehow different from the productId)
        const softwareIdUrl = `${this.baseUrlV3}/app-software/app-key/${appKey}`;
        console.log(`Calling Marketplace API: ${softwareIdUrl}`);

        const softwareIdResponse = await axios.get<v3Components["schemas"]["AppSoftwareByAppKeyResponse"][]>(softwareIdUrl, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        const softwareId = softwareIdResponse.data[0].appSoftwareId;

        // Get the versions for this app, which we use to extract the parentSoftwareId

        const versionsUrl = `${this.baseUrlV3}/app-software/${softwareId}/versions`;
        console.log(`Calling Marketplace API: ${versionsUrl}`);

        const response = await axios.get<v3Components["schemas"]["AppSoftwareVersionsGetResponse"]>(versionsUrl, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        if (!response.data.versions || response.data.versions.length === 0) {
            return undefined;
        }

        const parentSoftwareId = response.data.versions[0].compatibilities ? response.data.versions[0].compatibilities[0].parentSoftwareId : undefined;

        return parentSoftwareId;

        // The parentSoftwareId is currently a string like "confluence" or "jira", so we can return it directly, rather than going through
        // the next step to fetch the name (which serves just to capitalize the first letter)

        /*
        // Now fetch the parent software to get the name

        const parentSoftwareUrl = `${this.baseUrlV3}/parent-software/${parentSoftwareId}`;
        console.log(`Calling Marketplace API: ${parentSoftwareUrl}`);

        const parentSoftwareResponse = await axios.get<v3Components["schemas"]["ParentSoftwareGetResponse"]>(parentSoftwareUrl, {
            headers: { 'Authorization': await this.getAuthHeader() }
        });

        return parentSoftwareResponse.data.name;
        */
    }
}