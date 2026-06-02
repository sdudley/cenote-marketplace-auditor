import { inject, injectable } from 'inversify';
import axios from 'axios';
import { Readable } from 'stream';
import {
    InitiateAsyncLicense,
    InitiateAsyncLicenseCollection,
    InitiateAsyncTransactionCollection,
    LicenseData,
    PricingData,
    StatusAsyncTransactionCollection,
    TransactionData
} from '#common/types/marketplace';
import { components } from '#common/types/marketplace-api';
import { components as v3Components } from '#common/types/marketplace-v3-api';
import { TYPES } from '../config/types';
import { ConfigDao } from '../database/dao/ConfigDao';
import { ConfigKey } from '#common/types/configItem';
import { CloudOrServer, LicenseQueryParams, LiveOrPending, TransactionQueryParams } from '#server/services/types';

const licenseKey = (license : LicenseData) : string => license.appEntitlementNumber || license.licenseId;

@injectable()
export class MarketplaceService {
    private readonly baseUrl = 'https://marketplace.atlassian.com';
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
        statusLink: string,
        downloadLink: string,
        checkStatus: (data: any) => string
    ): Promise<string> {
        let status = 'IN_PROGRESS';
        let resultUrl: string | undefined;

        while (status === 'IN_PROGRESS' || status === 'QUEUED') {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls

            const statusResponse = await axios.get<T>(this.baseUrl + statusLink, {
                headers: {
                    'Authorization': await this.getAuthHeader()
                }
            });

            status = checkStatus(statusResponse.data);
            if (status === 'COMPLETED') {
                resultUrl = this.baseUrl + downloadLink;
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
            `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/sales/transactions/async/export`,
            { excludeZeroTransactions: false, includeManualInvoice: true }
        );
        console.log(`Calling Marketplace API: ${exportUrl}`);

        const exportResponse = await axios.post<InitiateAsyncTransactionCollection>(
            exportUrl,
            {},
            { headers: { 'Authorization': await this.getAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const resultUrl = await this.pollForCompletion<StatusAsyncTransactionCollection>(
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

        const firstExportUrl = this.buildUrlWithParams(
            `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/licenses/async/export`,
            { startDate: '2010-01-01', endDate: '2018-06-30', includeAtlassianLicenses: true }
        );
        console.log(`Calling Marketplace API: ${firstExportUrl}`);

        const firstExportResponse = await axios.post<InitiateAsyncLicenseCollection>(
            firstExportUrl,
            {},
            { headers: { 'Authorization': await this.getAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const firstResultUrl = await this.pollForCompletion<InitiateAsyncLicense>(
            firstExportResponse.data._links.status.href,
            firstExportResponse.data._links.download.href,
            (data) => data.export.status
        );

        console.log(`Streaming licenses (batch 1) from API`);
        const stream1 = await this.getStreamForResultUrl(firstResultUrl)

        const secondExportUrl = this.buildUrlWithParams(
            `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/licenses/async/export`,
            { startDate: '2018-07-01', withDataInsights: true, includeAtlassianLicenses: true }
        );
        console.log(`Calling Marketplace API: ${secondExportUrl}`);

        const secondExportResponse = await axios.post<InitiateAsyncLicenseCollection>(
            secondExportUrl,
            {},
            { headers: { 'Authorization': await this.getAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const secondResultUrl = await this.pollForCompletion<InitiateAsyncLicense>(
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

    async getPricing(
        addonKey: string,
        cloudOrServer: CloudOrServer,
        liveOrPending: LiveOrPending
    ): Promise<PricingData> {
        await this.initializeConfig();
        const url = `${this.baseUrl}/rest/2/addons/${addonKey}/pricing/${cloudOrServer}/${liveOrPending}`;
        console.log(`Calling Marketplace API: ${url}`);

        const response = await axios.get<PricingData>(url, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        return response.data;
    }

    async getVendorSpecificAddons(): Promise<{ key: string; name: string; }[]> {
        await this.initializeConfig();
        const url = this.buildUrlWithParams(
            `${this.baseUrl}/rest/2/addons`,
            {
                cost: 'marketplace',
                forThisUser: true
            }
        );
        console.log(`Calling Marketplace API: ${url}`);

        const response = await axios.get<components['schemas']['AddonCollection']>(url, {
            headers: {
                'Authorization': await this.getAuthHeader(),
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
            }
        });

        return response.data._embedded.addons.map(addon => ({ key: addon.key, name: addon.name }));
    }

    async getParentProductForAddon(addonKey: string): Promise<string|undefined> {
        await this.initializeConfig();
        const url = `${this.baseUrl}/rest/2/addons/${addonKey}/versions/latest`;
        console.log(`Calling Marketplace API: ${url}`);

        const response = await axios.get<components["schemas"]["AddonVersion"]>(url, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        return response.data.compatibilities ? response.data.compatibilities[0].application : undefined;
    }
}