import { inject, injectable } from 'inversify';
import axios from 'axios';
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

    constructor(
        @inject(TYPES.ConfigDao) private readonly configDao: ConfigDao
    ) {}

    private async initializeConfig(): Promise<void> {
        this.username = await this.configDao.get<string>(ConfigKey.AtlassianAccountUser) || '';
        this.password = await this.configDao.get<string>(ConfigKey.AtlassianAccountApiToken) || '';
        this.vendorId = await this.configDao.get<string>(ConfigKey.AtlassianVendorId) || '';
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

    private async fetchTransactionsWithParams(params: TransactionQueryParams): Promise<TransactionData[]> {
        await this.initializeConfig();
        const exportUrl = this.buildUrlWithParams(
            `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/sales/transactions/async/export`,
            params
        );
        console.log(`Calling Marketplace API: ${exportUrl}`);

        // Start the async export
        const exportResponse = await axios.post<InitiateAsyncTransactionCollection>(
            exportUrl,
            {},
            {
                headers: {
                    'Authorization': await this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            }
        );

        const resultUrl = await this.pollForCompletion<StatusAsyncTransactionCollection>(
            exportResponse.data._links.status.href,
            exportResponse.data._links.download.href,
            (data) => data.export.status
        );

        // Download the results
        const downloadUrl = resultUrl.split('?')[0]; // Remove query parameters
        console.log(`Calling Marketplace API: ${downloadUrl}`);

        const resultResponse = await axios.get<TransactionData[]>(resultUrl, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        return resultResponse.data;
    }

    private async fetchLicensesWithParams(params: LicenseQueryParams): Promise<LicenseData[]> {
        await this.initializeConfig();
        const exportUrl = this.buildUrlWithParams(
            `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/licenses/async/export`,
            params
        );
        console.log(`Calling Marketplace API: ${exportUrl}`);

        // Start the async export
        const exportResponse = await axios.post<InitiateAsyncLicenseCollection>(
            exportUrl,
            {},
            {
                headers: {
                    'Authorization': await this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            }
        );

        const resultUrl = await this.pollForCompletion<InitiateAsyncLicense>(
            exportResponse.data._links.status.href,
            exportResponse.data._links.download.href,
            (data) => data.export.status
        );

        // Download the results
        const downloadUrl = resultUrl.split('?')[0]; // Remove query parameters
        console.log(`Calling Marketplace API: ${downloadUrl}`);

        const resultResponse = await axios.get<LicenseData[]>(resultUrl, {
            headers: {
                'Authorization': await this.getAuthHeader()
            }
        });

        return resultResponse.data;
    }

    async getTransactions(): Promise<TransactionData[]> {
        return await this.fetchTransactionsWithParams({
            excludeZeroTransactions: false,
            includeManualInvoice: true
        });
    }

    async getLicenses(): Promise<LicenseData[]> {
        // First call: 2010-01-01 to 2018-06-30
        const firstBatch = await this.fetchLicensesWithParams({
            startDate: '2010-01-01',
            endDate: '2018-06-30',
            includeAtlassianLicenses: true
        });

        // Second call: 2018-07-01 onwards
        const secondBatch = await this.fetchLicensesWithParams({
            startDate: '2018-07-01',
            withDataInsights: true,
            includeAtlassianLicenses: true
        });

        // The second "with insights" may duplicate data from the first batch, but we should
        // always override that with the second batch data because it includes more fields.

        // Create a map of secondBatch keys for quick lookup
        const secondBatchKeys = new Set(secondBatch.map(licenseKey));

        // Filter out any licenses from firstBatch that appear in secondBatch
        const filteredFirstBatch = firstBatch.filter(license => !secondBatchKeys.has(licenseKey(license)));

        // Combine the filtered first batch with the second batch
        return [...filteredFirstBatch, ...secondBatch];
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