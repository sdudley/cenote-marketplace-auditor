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

export interface LicenseData {
    id: string;
    // Add other license fields as needed based on the actual response structure
    [key: string]: any;
}

export interface TransactionData {
    id: string;
    // Add other transaction fields as needed based on the actual response structure
    [key: string]: any;
}

export interface components {
    schemas: {
        License: {
            /** @description The unique identifier for this license, for example "12345" or "E-123-456-789" */
            addonLicenseId: string;
            /** @description The new identifier for this license, for example "709a7212-3330-4ba6-9785-9804a9983373". Applies to cloud licenses only */
            appEntitlementId?: string;
            /** @description The new customer facing identifier for this license, for example "E-123-456-789". Applies to cloud licenses only */
            appEntitlementNumber?: string;
            /** @description The unique identifier for this host instance, for example "12345" or "E-123-456-789". Applies to cloud licenses only */
            hostLicenseId?: string;
            /** @description The new identifier for the parent product license, for example  "123a1234-1234-1ab2-1234-1234a1234567". Applies to cloud licenses only */
            hostEntitlementId?: string;
            /** @description The new customer facing identifier for the parent product license, for example "E-123-456-789". Applies to cloud licenses only */
            hostEntitlementNumber?: string;
            /** @description The customer-facing identifier for this license, for example "SEN-12345" or "E-123-456-789". */
            licenseId: string;
            /** @description The unique identifier representing the cloud site that the app is installed in. This will be present for all active cloud licenses. */
            cloudId?: string;
            /** @description The hostname for the cloud site that the app is installed in. This will be present for all active cloud licenses. */
            cloudSiteHostname?: string;
            /** @description The unique identifier for this app, for example "com.atlassian.confluence.plugins.confluence-questions". */
            addonKey: string;
            /** @description The display name of the app, for example "Questions for Confluence". */
            addonName: string;
            /** @description The platform on which the app runs (either 'Server', 'Data Center' or 'Cloud') */
            hosting: string;
            /**
             * Format: date
             * @description The date on which the data was last updated. This can be used to identify when historical sale/license data is updated for any reason.
             */
            lastUpdated: string;
            /** @description The unique identifier for this license type, for example "COMMERCIAL" */
            licenseType: string;
            /**
             * Format: date
             * @description The date on which license maintenance begins
             */
            maintenanceStartDate: string;
            /**
             * Format: date
             * @description The date on which license maintenance ends
             */
            maintenanceEndDate?: string;
            /** @description The unique identifier for the status of this license; a status of 'inactive' denotes that the license has expired */
            status: string;
            /** @description The user/edition count, for example, 100 Users. */
            tier: string;
            cmtDetails?: components["schemas"]["CmtDetails"];
            contactDetails: components["schemas"]["LicenseContactDetails"];
            partnerDetails?: components["schemas"]["PartnerContact"];
            attribution?: components["schemas"]["AttributionDetails"];
            /** @description Evaluation opportunity information giving the host license size */
            evaluationOpportunitySize?: string;
            /** @description A mapping of the sale license to the corresponding evaluation license if present */
            evaluationLicense?: string;
            /** @description A parameter providing the difference in days between sale date and evaluation end date of an apps's license */
            daysToConvertEval?: string;
            /** @description Start date of the matching evaluation license for the current license */
            evaluationStartDate?: string;
            /** @description End date of the matching evaluation license for the current license */
            evaluationEndDate?: string;
            /** @description Sale date of the matching evaluation license for the current license */
            evaluationSaleDate?: string;
            /** @description The number of months for which evaluation license parent product is valid. */
            parentProductBillingCycle?: string;
            /** @description Name of the parent product on which the app is hosted, for example "Jira". */
            parentProductName?: string;
            /** @description A short description of the pricing tier or user level of the license's parent product, for example, "Premium". */
            parentProductEdition?: string;
            /** @description Licence is installed on sandbox site or not. */
            installedOnSandbox?: string;
          };

        /** @description License CMT details, if applicable. */
        CmtDetails: {
            /** @description Status of the CMT license ('active', 'converted' or 'non-converted') */
            status: string;
            /** @description The on-premise license ID for which CMT is applied. */
            relatedOnPremLicense: string;
        };

        LicenseContactDetails: {
            /** @description The name of the organization which purchased the app */
            company?: string;
            /** @description The name of the country in which the customer was billed */
            country?: string;
            /** @description The name of the region in which the customer was billed */
            region?: string;
            technicalContact?: components["schemas"]["LicenseContact"];
            billingContact?: components["schemas"]["LicenseContact"];
          };

          LicenseContact: {
            /** @description Email address of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            email?: string;
            /** @description Name of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            name?: string;
            /** @description Phone number of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            phone?: string;
            /** @description First line of the address of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            address1?: string;
            /** @description Second line of the address of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            address2?: string;
            /** @description City of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            city?: string;
            /** @description State of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            state?: string;
            /** @description Post code of the contact, if available. If the contact has requested to be forgotten, the value will be "RTBF" */
            postcode?: string;
          };

        /** @description The partner details for the license */
        PartnerContact: {
            /** @description The partner's organization name */
            partnerName: string;
            /** @description The type of partner ('Expert', 'Reseller' or 'Corporate_reseller'). The type will be 'Unknown' if we are unable to determine it. */
            partnerType: string;
            billingContact?: components["schemas"]["LicenseContact"];
        };

        /** @description Marketing attribution data */
        AttributionDetails: {
            /** @description The channel through which app was sold to a customer */
            channel?: string;
            /** @description The domain from the referrer */
            referrerDomain?: string;
            /** @description A parameter to identify the source of the traffic */
            campaignSource?: string;
            /** @description A parameter to identify the medium the link was used upon */
            campaignMedium?: string;
            /** @description A parameter to identify a specific product promotion or strategic campaign */
            campaignName?: string;
            /** @description Optional parameter for additional details for A/B testing and content-targeted ads */
            campaignContent?: string;
        };

        /** @description Describes a single transaction of a vendor's app. */
        Transaction: {
            /** @description The unique identifier for this transaction, for example "AT-12345" */
            transactionId: string;
            /** @description The unique identifier for this license, for example "12345" or "E-123-456-789" */
            addonLicenseId: string;
            /** @description The new identifier for this license, for example "709a7212-3330-4ba6-9785-9804a9983373". Applies to cloud licenses only */
            appEntitlementId?: string;
            /** @description The new customer facing identifier for this license, for example "E-123-456-789". Applies to cloud licenses only */
            appEntitlementNumber?: string;
            /** @description The unique identifier for this host instance, for example "12345" or "E-123-456-789". Applies to cloud licenses only */
            hostLicenseId?: string;
            /** @description The new identifier for the parent product license, for example "123a1234-1234-1ab2-1234-1234a1234567". Applies to cloud licenses only */
            hostEntitlementId?: string;
            /** @description The new customer facing identifier for the parent product license, for example "E-123-456-789". Applies to cloud licenses only */
            hostEntitlementNumber?: string;
            /** @description The customer-facing identifier for this license, for example "SEN-12345" or "E-123-456-789" */
            licenseId: string;
            /** @description The unique identifier for this app, for example "com.atlassian.confluence.plugins.confluence-questions" */
            addonKey: string;
            /** @description The display name of the app, for example "Questions for Confluence" */
            addonName: string;
            /**
             * Format: date
             * @description The date on which the data was last updated. This can be used to identify when historical sale/license data is updated for any reason.
             */
            lastUpdated: string;
            /** @description The unique identifier representing the cloud site that the app is installed in. This will be present for all active cloud licenses. */
            cloudId?: string;
            /**
             * @description The status of payment for the transaction.
             * @enum {string}
             */
            paymentStatus?: "Paid" | "Open" | "Uncollectible" | "Refunded";
            dunningStatus?: components["schemas"]["DunningStatus"];
            customerDetails: components["schemas"]["TransactionCustomerDetails"];
            purchaseDetails: components["schemas"]["TransactionPurchaseDetails"];
            partnerDetails?: components["schemas"]["TransactionPartnerDetails"];
        };

        /** @description The customer details for the transaction. */
        TransactionCustomerDetails: {
            /** @description The name of the organization which purchased the app */
            company?: string;
            /** @description The name of the country in which the customer was billed */
            country: string;
            /** @description The name of the region in which the customer was billed */
            region: string;
            technicalContact?: components["schemas"]["TransactionContact"];
            billingContact?: components["schemas"]["TransactionContact"];
        };

          /** @description The purchase details for a transaction. */
        TransactionPurchaseDetails: {
            /**
             * Format: date
             * @description The transaction date, payment date or due date (for transactions having Net 14/30 payment terms)
             */
            saleDate: string;
            /**
             * @description The unique identifier for this license type.
             * @enum {string}
             */
            licenseType:
            | "ACADEMIC"
            | "COMMERCIAL"
            | "COMMUNITY"
            | "EVALUATION"
            | "OPEN_SOURCE";
            /**
             * @description The platform on which the app runs.
             * @enum {string}
             */
            hosting: "Server" | "Data Center" | "Cloud";
            /**
             * @description The time period for which the transaction is billed.
             * @enum {string}
             */
            billingPeriod: "Monthly" | "Annual";
            /**
             * @description Shows whether there is change in the billing period of an app from the (n-1)th transaction to nth transaction.
             * @enum {string}
             */
            changeInBillingPeriod?: "Yes" | "No";
            /**
             * @description The (n-1)th transaction’s billing period of an app.
             * @enum {string}
             */
            oldBillingPeriod?: "Monthly" | "Annual" | "Other";
            /** @description The user/edition count. For example 100 Users, Unlimited Users, Per Unit Pricing (593 Users) */
            tier: string;
            /**
             * @description Shows whether there is change in the user/edition count from the (n-1)th transaction to nth transaction
             * @enum {string}
             */
            changeInTier?: "Increase" | "Decrease" | "Not Applicable";
            /** @description The (n-1)th transaction’s user/edition count.  For example 100 Users, Unlimited Users, Per Unit Pricing (593 Users) */
            oldTier?: string;
            /**
             * @description Name of the parent product on which the app is hosted. Applies to cloud licenses only.
             * @enum {string}
             */
            parentProductName?: "Jira" | "Confluence" | "Pending";
            /**
             * @description A short description of the pricing tier or user level of the license parent product. Applies to cloud licenses only.
             * @enum {string}
             */
            parentProductEdition?: "Jira" | "Confluence" | "Pending";
            /**
             * @description Shows whether there is change in the parent edition from the (n-1)th transaction to nth transaction. Applies to cloud licenses only
             * @enum {string}
             */
            changeInParentProductEdition?: "Yes" | "No";
            /** @description The (n-1)th transaction’s parent edition. Applies to cloud licenses only */
            oldParentProductEdition?: string;
            /**
             * Format: float
             * @description The sale price in USD, for example 100.0
             */
            purchasePrice: number;
            /**
             * Format: float
             * @description The portion of the sale price which will be paid to the partner in USD, for example 90.0
             */
            vendorAmount: number;
            /**
             * Format: float
             * @description For partner sales, the amount discounted before the sale price.
             */
            partnerDiscountAmount?: number;
            /** @description List of discounts that are applied on the transaction. */
            discounts?: components["schemas"]["TransactionDiscount"][];
            /** @description The reason of refund for the transaction, for example 'REFUND_CANCELLED_PURCHASE' */
            refundReason?: string;
            /** @description The reason of credit note for the transaction, for example '30 DAY REFUND REQUEST' */
            creditNoteReason?: string;
            /**
             * @description The display name of the sale type.
             * @enum {string}
             */
            saleType: "New" | "Refund" | "Renewal" | "Upgrade";
            /**
             * Format: date
             * @description The date on which license maintenance begins.
             */
            maintenanceStartDate: string;
            /**
             * Format: date
             * @description The date on which license maintenance ends.
             */
            maintenanceEndDate: string;
            /**
             * @description Credit limit offered to customers.
             * @enum {string}
             */
            paymentTerms?: "Net14" | "Net30";
            originalTransactionDetails?: components["schemas"]["OriginalTransactionDetails"];
        };

          /** @description Details of the original transaction for which amount is being adjusted */
        OriginalTransactionDetails: {
            /** @description Transaction Id of the original transaction. */
            transactionId?: string;
            /** @description Sale date of original transaction */
            saleDate?: string;
        };

        /** @description The partner details for the transaction. */
        TransactionPartnerDetails: {
            /** @description The partner's organization name. */
            partnerName: string;
            /**
             * @description The type of partner. The value will be 'Unknown' if we are unable to determine it.
             * @enum {string}
             */
            partnerType: "Expert" | "Reseller" | "Corporate_reseller" | "Unknown";
            billingContact?: components["schemas"]["TransactionContact"];
        };

        /** @description The contact details for a transaction */
        TransactionContact: {
            /** @description The contact's email address. If the contact has requested to be forgotten, the value will be "RTBF" */
            email?: string;
            /** @description The contact's full name, if provided. If the contact has requested to be forgotten, the value will be "RTBF" */
            name?: string;
        };

        /** @description Captures the details of a single discount applied on the transaction */
        TransactionDiscount: {
            /**
             * @description The type of discount applied on the transaction.
             * @enum {string}
             */
            type: "LOYALTY_DISCOUNT" | "EXPERT" | "MANUAL" | "MARKETPLACE_PROMOTION";
            /**
             * Format: double
             * @description The amount discounted in USD, for example 20.0
             */
            amount: number;
            /** @description The code applied for the discount. The code is currently available only for 'MARKETPLACE_PROMOTION' discount type. */
            code?: string;
        };

        /** @description The dunning status or payment failure details are mentioned for the transaction. */
        DunningStatus: components["schemas"]["DunningStatusDetails"][];

        DunningStatusDetails: {
            /**
             * Format: int32
             * @description The nth attempt for payment as part of retrying a failed payment
             */
            attemptCount: number;
            /** @description The error code for the failed payment, for example 'expired card'. */
            errorCode?: string;
            /**
             * Format: date
             * @description The date on which the payment was attempted.
             */
            paymentAttemptDate: string;
            /**
             * Format: date
             * @description The date on which the next payment attempt will be made.
             */
            nextPaymentAttemptDate?: string;
          };

    };
}

