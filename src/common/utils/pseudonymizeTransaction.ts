import { Transaction } from '#common/entities/Transaction';
import type { TransactionData } from '#common/types/marketplace';
import { faker } from '@faker-js/faker';
import { randomizeNumericString, generateFormattedId, scaleAmount, transformCurrencyInText, transformIdWithPrefix } from './pseudonymizeUtils';

export function pseudonymizeTransaction(transaction: Transaction): Transaction {
    // Create a deep copy of the transaction
    const pseudonymized = structuredClone(transaction);

    // Transform entitlementId while preserving prefix
    pseudonymized.entitlementId = transformIdWithPrefix(pseudonymized.entitlementId);

    // Transform data object
    if (pseudonymized.data) {
        pseudonymized.data = pseudonymizeTransactionData(pseudonymized.data);
    }

    // Transform reconcile object
    if (pseudonymized.reconcile) {
        const scaleFactor = faker.number.float({ min: 0.8, max: 1.2, fractionDigits: 2 });
        if (typeof pseudonymized.reconcile.actualVendorAmount === 'number') {
            pseudonymized.reconcile.actualVendorAmount = scaleAmount(pseudonymized.reconcile.actualVendorAmount);
        }
        if (typeof pseudonymized.reconcile.expectedVendorAmount === 'number') {
            pseudonymized.reconcile.expectedVendorAmount = scaleAmount(pseudonymized.reconcile.expectedVendorAmount);
        }

        // Transform reconcile notes
        if (pseudonymized.reconcile.notes) {
            pseudonymized.reconcile.notes = pseudonymized.reconcile.notes.map(note => {
                const transformedNote = { ...note };
                if (transformedNote.note) {
                    transformedNote.note = transformCurrencyInText(transformedNote.note, scaleFactor);
                }
                return transformedNote as typeof note;
            });
        }
    }

    return pseudonymized;
}

export function pseudonymizeTransactionData(data: TransactionData): TransactionData {
    const pseudonymizedData = structuredClone(data);

    // Transform addon details
    pseudonymizedData.addonKey = 'com.myapp';
    pseudonymizedData.addonName = 'My App';

    // Transform licenseId while preserving prefix
    if (pseudonymizedData.licenseId) {
        pseudonymizedData.licenseId = transformIdWithPrefix(pseudonymizedData.licenseId);
    }

    pseudonymizedData.transactionId = `AT-${randomizeNumericString(9)}`;
    pseudonymizedData.addonLicenseId = randomizeNumericString(8);

    // Transform partner details
    if (pseudonymizedData.partnerDetails) {
        pseudonymizedData.partnerDetails.partnerName = faker.company.name();
        if (pseudonymizedData.partnerDetails.billingContact) {
            pseudonymizedData.partnerDetails.billingContact.name = faker.person.fullName();
            pseudonymizedData.partnerDetails.billingContact.email = faker.internet.email();
        }
    }

    // Transform customer details
    if (pseudonymizedData.customerDetails) {
        pseudonymizedData.customerDetails.company = faker.company.name();
        if (pseudonymizedData.customerDetails.billingContact) {
            pseudonymizedData.customerDetails.billingContact.name = faker.person.fullName();
            pseudonymizedData.customerDetails.billingContact.email = faker.internet.email();
        }
        if (pseudonymizedData.customerDetails.technicalContact) {
            pseudonymizedData.customerDetails.technicalContact.name = faker.person.fullName();
            pseudonymizedData.customerDetails.technicalContact.email = faker.internet.email();
        }
    }

    if (pseudonymizedData.appEntitlementNumber) {
        pseudonymizedData.appEntitlementNumber = `E-${generateFormattedId()}`;
    }

    if (pseudonymizedData.appEntitlementId) {
        pseudonymizedData.appEntitlementId = faker.string.uuid();
    }

    if (pseudonymizedData.cloudId) {
        pseudonymizedData.cloudId = faker.string.uuid();
    }

    if (pseudonymizedData.hostEntitlementId) {
        pseudonymizedData.hostEntitlementId = faker.string.uuid();
    }

    if (pseudonymizedData.hostEntitlementNumber) {
        pseudonymizedData.hostEntitlementNumber = `E-${generateFormattedId()}`;
    }

    if (pseudonymizedData.hostEntitlementId) {
        pseudonymizedData.hostEntitlementId = faker.string.uuid();
    }

    if (pseudonymizedData.transactionLineItemId) {
        pseudonymizedData.transactionLineItemId = faker.string.uuid();
    }

    // Transform purchase details
    if (pseudonymizedData.purchaseDetails) {
        const scaleFactor = faker.number.float({ min: 0.8, max: 1.2, fractionDigits: 2 });
        if (typeof pseudonymizedData.purchaseDetails.vendorAmount === 'number') {
            pseudonymizedData.purchaseDetails.vendorAmount = scaleAmount(pseudonymizedData.purchaseDetails.vendorAmount);
        }
        if (typeof pseudonymizedData.purchaseDetails.purchasePrice === 'number') {
            pseudonymizedData.purchaseDetails.purchasePrice = scaleAmount(pseudonymizedData.purchaseDetails.purchasePrice);
        }
    }

    return pseudonymizedData;
}