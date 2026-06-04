import { LicenseData } from '#common/types/marketplace.js';
import { computeJsonPaths, normalizeObject } from './objectUtils.js';

export type LicenseHistorySnapshot = LicenseData & { recordCreatedDate?: string };

export interface LicenseVersionDto {
    id: string;
    createdAt: string;
    entitlementId: string;
    version: number;
    data: LicenseData;
    diff?: string;
}

function stripRecordCreatedDate(data: LicenseHistorySnapshot): LicenseData {
    const { recordCreatedDate: _recordCreatedDate, ...licenseData } = data;
    return licenseData as LicenseData;
}

export function buildLicenseVersionsFromHistory(
    snapshots: LicenseHistorySnapshot[],
    entitlementId: string
): LicenseVersionDto[] {
    const sorted = [...snapshots].sort((a, b) => {
        const dateA = a.recordCreatedDate ?? a.lastUpdated ?? '';
        const dateB = b.recordCreatedDate ?? b.lastUpdated ?? '';
        return dateA.localeCompare(dateB);
    });

    const versions: LicenseVersionDto[] = [];

    for (let i = 0; i < sorted.length; i++) {
        const snapshot = sorted[i];
        const data = stripRecordCreatedDate(snapshot);
        const normalizedData = normalizeObject(data);

        let diff: string | undefined;
        if (i > 0) {
            const priorData = normalizeObject(stripRecordCreatedDate(sorted[i - 1]));
            const changedPaths = computeJsonPaths(priorData, normalizedData);
            if (changedPaths.length > 0) {
                diff = changedPaths.join(' | ');
            }
        }

        versions.push({
            id: `atlassian-v${i + 1}`,
            createdAt: snapshot.recordCreatedDate ?? snapshot.lastUpdated,
            entitlementId,
            version: i + 1,
            data: normalizedData,
            diff
        });
    }

    return versions.reverse();
}
