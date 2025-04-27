import { components } from './marketplace-api';

export interface Link {
    /**
     * Format: uri
     * @description The link URI - hostname and scheme will be omitted if it is a link within Marketplace
     */
    href: string;
    /** @description Content type of the linked data - may be omitted for JSON resources, will be "text/html" for web pages */
    type?: string;
    /** @description Display name of the link - usually omitted */
    title?: string;
}

export interface InitiateAsyncLicenseCollectionLinks {
    self: Link;
    query: Link;
    status: Link;
    download: Link;
}

export interface InitiateAsyncLicense {
    /** @description Unique export id for licenses export, for example "12345678-ab12-12ab-1234-123a4b5678ab" */
    id: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    resultUrl?: string;
    error?: string;
}

export interface InitiateAsyncLicenseCollection {
    _links: InitiateAsyncLicenseCollectionLinks;
    export: InitiateAsyncLicense;
}

export interface InitiateAsyncTransactionCollectionLinks {
    self: Link;
    query: Link;
    status: Link;
    download: Link;
}

export interface InitiateAsyncTransaction {
    /** @description Unique export id for transactions export */
    id: string;
}

export interface InitiateAsyncTransactionCollection {
    _links: InitiateAsyncTransactionCollectionLinks;
    export: InitiateAsyncTransaction;
}

export interface StatusAsyncTransactionCollectionLinks {
    self: Link;
    query: Link;
    download: Link;
}

export interface StatusAsyncTransaction {
    /** @description Unique export id for transactions export */
    id: string;
    /**
     * @description Indicates the status of the transaction request
     * @enum {string}
     */
    status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface StatusAsyncTransactionCollection {
    _links: StatusAsyncTransactionCollectionLinks;
    export: StatusAsyncTransaction;
}

export type TransactionData = components["schemas"]["Transaction"];
export type LicenseData = components["schemas"]["License"];
export type PricingData = components["schemas"]["Pricing"];
export type PricingItem = components["schemas"]["PricingItem"];