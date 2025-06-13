import { License } from '#common/entities/License';
import { faker } from '@faker-js/faker';
import type { LicenseData } from '#common/types/marketplace';
import { randomizeNumericString, generateFormattedId, transformIdWithPrefix } from './pseudonymizeUtils';

export function pseudonymizeLicense(license: License): License {
    // Create a deep copy of the license
    const pseudonymized = structuredClone(license);

    // Transform entitlementId while preserving prefix
    pseudonymized.entitlementId = transformIdWithPrefix(pseudonymized.entitlementId);

    // Transform data object
    if (pseudonymized.data) {
        pseudonymized.data = pseudonymizeLicenseData(pseudonymized.data);
    }

    return pseudonymized;
}

function pseudonymizeContact(contact: any) {
    if (!contact) return contact;

    return {
        ...contact,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address1: faker.location.streetAddress(),
        address2: faker.location.secondaryAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postcode: faker.location.zipCode()
    };
}

export function pseudonymizeLicenseData(data: LicenseData): LicenseData {
    const pseudonymizedData = structuredClone(data);

    // Transform IDs
    if (pseudonymizedData.addonLicenseId) {
        pseudonymizedData.addonLicenseId = randomizeNumericString(8);
    }

    if (pseudonymizedData.appEntitlementId) {
        pseudonymizedData.appEntitlementId = faker.string.uuid();
    }

    if (pseudonymizedData.appEntitlementNumber) {
        pseudonymizedData.appEntitlementNumber = `E-${generateFormattedId()}`;
    }

    if (pseudonymizedData.hostLicenseId) {
        pseudonymizedData.hostLicenseId = faker.string.uuid();
    }

    if (pseudonymizedData.hostEntitlementId) {
        pseudonymizedData.hostEntitlementId = faker.string.uuid();
    }

    if (pseudonymizedData.licenseId) {
        pseudonymizedData.licenseId = transformIdWithPrefix(pseudonymizedData.licenseId);
    }

    if (pseudonymizedData.cloudId) {
        pseudonymizedData.cloudId = faker.string.uuid();
    }

    if (pseudonymizedData.cloudSiteHostname) {
        pseudonymizedData.cloudSiteHostname = faker.internet.domainName();
    }

    // Transform addon details
    pseudonymizedData.addonKey = 'com.myapp';
    pseudonymizedData.addonName = 'My App';

    // Transform contact details
    if (pseudonymizedData.contactDetails) {
        pseudonymizedData.contactDetails = {
            ...pseudonymizedData.contactDetails,
            company: faker.company.name(),
            country: faker.location.country(),
            region: faker.location.state(),
            technicalContact: pseudonymizeContact(pseudonymizedData.contactDetails.technicalContact),
            billingContact: pseudonymizeContact(pseudonymizedData.contactDetails.billingContact)
        };
    }

    // Transform partner details
    if (pseudonymizedData.partnerDetails) {
        pseudonymizedData.partnerDetails = {
            ...pseudonymizedData.partnerDetails,
            partnerName: faker.company.name(),
            billingContact: pseudonymizeContact(pseudonymizedData.partnerDetails.billingContact)
        };
    }

    return pseudonymizedData;
}