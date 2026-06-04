import React, { useState, useEffect } from 'react';
import {
    TableBody,
    TableHead,
    TableRow,
    CircularProgress
} from '@mui/material';
import { LicenseVersion } from '#common/entities/LicenseVersion.js';
import { LicenseVersionDto } from '#common/util/licenseVersionUtils.js';
import {
    VersionListContainer,
    VersionListTable,
    VersionNumberCell,
    VersionDateCell,
    VersionDiffCell,
    LoadingOverlay,
    VersionHeaderCell
} from '../../components/styles';
import { LicenseVersionDialog } from './LicenseVersionDialog';
import { StyledTableCell } from '../../components/styles';
import { formatLicenseVersionDiffLabel } from './util';

export type LicenseVersionSource = 'database' | 'atlassian';

type DisplayableLicenseVersion = LicenseVersion | LicenseVersionDto;

interface LicenseVersionListProps {
    licenseId: string;
    source?: LicenseVersionSource;
}

export const LicenseVersionList: React.FC<LicenseVersionListProps> = ({
    licenseId,
    source = 'database'
}) => {
    const [versions, setVersions] = useState<DisplayableLicenseVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<DisplayableLicenseVersion | null>(null);
    const [priorVersion, setPriorVersion] = useState<DisplayableLicenseVersion | null>(null);

    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            try {
                const endpoint = source === 'atlassian'
                    ? `/api/licenses/${licenseId}/versions/atlassian`
                    : `/api/licenses/${licenseId}/versions`;
                const response = await fetch(endpoint);
                const data = await response.json();
                setVersions(data);
            } catch (error) {
                console.error('Error fetching license versions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [licenseId, source]);

    const handleRowClick = (version: DisplayableLicenseVersion) => {
        setSelectedVersion(version);

        const prior = versions.find(v => v.version === version.version - 1);
        setPriorVersion(prior || null);
    };

    return (
        <VersionListContainer>
            <VersionListTable>
                <TableHead>
                    <TableRow>
                        <VersionHeaderCell>Version</VersionHeaderCell>
                        <VersionHeaderCell>Created</VersionHeaderCell>
                        <VersionHeaderCell>Changes</VersionHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading && (
                        <TableRow>
                            <StyledTableCell colSpan={3}>
                                <LoadingOverlay>
                                    <CircularProgress />
                                </LoadingOverlay>
                            </StyledTableCell>
                        </TableRow>
                    )}
                    {!loading && versions.map((version) => (
                        <TableRow
                            key={version.id}
                            onClick={() => handleRowClick(version)}
                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        >
                            <VersionNumberCell>{version.version}</VersionNumberCell>

                            <VersionDateCell>
                                {version.createdAt.toString().substring(0, 16).replace('T', ' ')}
                            </VersionDateCell>

                            <VersionDiffCell>
                                {formatLicenseVersionDiffLabel(version.version, version.diff)}
                            </VersionDiffCell>
                        </TableRow>
                    ))}
                </TableBody>
            </VersionListTable>

            <LicenseVersionDialog
                version={selectedVersion}
                priorVersion={priorVersion}
                open={!!selectedVersion}
                onClose={() => {
                    setSelectedVersion(null);
                    setPriorVersion(null);
                }}
            />
        </VersionListContainer>
    );
};