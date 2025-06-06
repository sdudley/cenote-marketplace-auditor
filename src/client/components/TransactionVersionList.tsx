import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    CircularProgress
} from '@mui/material';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import {
    VersionListContainer,
    VersionListTable,
    VersionNumberCell,
    VersionDateCell,
    VersionDiffCell,
    LoadingOverlay,
    VersionHeaderCell
} from './styles';
import { TransactionVersionDialog } from './TransactionVersionDialog';

interface TransactionVersionListProps {
    transactionId: string;
}

export const TransactionVersionList: React.FC<TransactionVersionListProps> = ({ transactionId }) => {
    const [versions, setVersions] = useState<TransactionVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<TransactionVersion | null>(null);
    const [priorVersion, setPriorVersion] = useState<TransactionVersion | null>(null);

    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/transactions/${transactionId}/versions`);
                const data = await response.json();
                setVersions(data);
            } catch (error) {
                console.error('Error fetching transaction versions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [transactionId]);

    const handleRowClick = (version: TransactionVersion) => {
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
                            <TableCell colSpan={3}>
                                <LoadingOverlay>
                                    <CircularProgress />
                                </LoadingOverlay>
                            </TableCell>
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
                            <VersionDiffCell>{version.diff}</VersionDiffCell>
                        </TableRow>
                    ))}
                </TableBody>
            </VersionListTable>

            <TransactionVersionDialog
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