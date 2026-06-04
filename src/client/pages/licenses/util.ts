import { LicenseData } from '#common/types/marketplace.js';

interface ExportLicenseParams {
    licenseData: LicenseData;
    suffix?: string;
}

export const formatLicenseVersionDiffLabel = (version: number, diff?: string): string => {
    if (diff) {
        return diff;
    }
    return version === 1 ? 'Initial version' : 'No changes';
};

export const handleExportLicense = ({ licenseData, suffix }: ExportLicenseParams): void => {
    const baseFileName = licenseData.appEntitlementNumber || licenseData.licenseId || licenseData.addonLicenseId || 'license';
    const fileName = suffix ? `${baseFileName}-${suffix}.json` : `${baseFileName}.json`;

    // Create a blob with the JSON data
    const blob = new Blob([JSON.stringify(licenseData, null, 2)], {
        type: 'application/json'
    });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
