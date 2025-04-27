import axios from 'axios';
import {
    InitiateAsyncLicenseCollection,
    InitiateAsyncLicense,
    InitiateAsyncTransactionCollection,
    StatusAsyncTransactionCollection,
    LicenseData,
    TransactionData
} from '../types/marketplace';

export class MarketplaceService {
    private readonly username: string;
    private readonly password: string;
    private readonly baseUrl = 'https://marketplace.atlassian.com';
    private readonly vendorId: string;

    constructor(username: string, password: string, vendorId: string) {
        this.username = username;
        this.password = password;
        this.vendorId = vendorId;
    }

    private getAuthHeader(): string {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return `Basic ${credentials}`;
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
                    'Authorization': this.getAuthHeader()
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

    async getTransactions(): Promise<TransactionData[]> {
        const exportUrl = `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/sales/transactions/async/export`;
        console.log(`Calling Marketplace API: ${exportUrl}`);

        // Start the async export
        const exportResponse = await axios.post<InitiateAsyncTransactionCollection>(
            exportUrl,
            {},
            {
                headers: {
                    'Authorization': this.getAuthHeader(),
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
                'Authorization': this.getAuthHeader()
            }
        });

        return resultResponse.data;
    }

    async getLicenses(): Promise<LicenseData[]> {
        const exportUrl = `${this.baseUrl}/rest/2/vendors/${this.vendorId}/reporting/licenses/async/export`;
        console.log(`Calling Marketplace API: ${exportUrl}`);

        // Start the async export
        const exportResponse = await axios.post<InitiateAsyncLicenseCollection>(
            exportUrl,
            {},
            {
                headers: {
                    'Authorization': this.getAuthHeader(),
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
                'Authorization': this.getAuthHeader()
            }
        });

        return resultResponse.data;
    }
}