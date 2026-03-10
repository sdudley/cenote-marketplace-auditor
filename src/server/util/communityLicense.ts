import { EnhancedLicenseType } from "#common/types/marketplace";

export const isCommunityLicense = (licenseType: EnhancedLicenseType): boolean => {
    return licenseType==='COMMUNITY' ||
            licenseType==='SOCIAL_IMPACT' ||
            licenseType==='SOCIAL_IMPACT_GLOBAL_ACCESS' ||
            licenseType==='FOUNDATION_FREE';
};

export const isDiscountedLicenseType = (licenseType: EnhancedLicenseType): boolean => {
    return licenseType==='ACADEMIC' || isCommunityLicense(licenseType);
};