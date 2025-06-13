import React, { useState, useEffect } from 'react';
import {
    TableBody,
    TableHead,
    TableRow,
    CircularProgress
} from '@mui/material';
import { LicenseVersion } from '#common/entities/LicenseVersion';
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

interface LicenseVersionListProps {
    licenseId: string;
}

export const LicenseVersionList: React.FC<LicenseVersionListProps> = ({ licenseId }) => {
    const [versions, setVersions] = useState<LicenseVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<LicenseVersion | null>(null);
    const [priorVersion, setPriorVersion] = useState<LicenseVersion | null>(null);

    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/licenses/${licenseId}/versions`);
                const data = await response.json();
                setVersions(data);
            } catch (error) {
                console.error('Error fetching license versions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [licenseId]);

    const handleRowClick = (version: LicenseVersion) => {
        setSelectedVersion(version);

        // Find the prior version from our existing versions array
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
                    {versions.map((version) => (
                        <TableRow
                            key={version.id}
                            onClick={() => handleRowClick(version)}
                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        >
                            <VersionNumberCell>{version.version}</VersionNumberCell>

                            <VersionDateCell>
                                {version.createdAt.toString().substring(0, 16).replace('T', ' ')}
                            </VersionDateCell>

                            <VersionDiffCell>{version.diff ?? 'Initial version'}</VersionDiffCell>
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