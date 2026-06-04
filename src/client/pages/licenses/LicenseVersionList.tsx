import React, { useState, useEffect } from 'react';
import {
    TableBody,
    TableHead,
    TableRow,
    CircularProgress,
    Alert
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<DisplayableLicenseVersion | null>(null);
    const [priorVersion, setPriorVersion] = useState<DisplayableLicenseVersion | null>(null);

    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            setErrorMessage(null);
            setVersions([]);
            try {
                const endpoint = source === 'atlassian'
                    ? `/api/licenses/${licenseId}/versions/atlassian`
                    : `/api/licenses/${licenseId}/versions`;
                const response = await fetch(endpoint);
                const data = await response.json();
                if (!response.ok) {
                    const message = typeof data?.error === 'string'
                        ? data.error
                        : `Failed to load license versions (HTTP ${response.status})`;
                    setErrorMessage(message);
                    return;
                }
                if (!Array.isArray(data)) {
                    setErrorMessage('Unexpected response from server');
                    return;
                }
                setVersions(data);
            } catch (error) {
                console.error('Error fetching license versions:', error);
                setErrorMessage('Failed to load license versions');
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
            {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMessage}
                </Alert>
            )}
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