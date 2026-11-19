import React, { useState, useEffect, useMemo } from 'react';
import {
    TableBody,
    TableHead,
    TableRow,
    CircularProgress
} from '@mui/material';
import { TransactionVersion } from '#common/entities/TransactionVersion.js';
import {
    VersionListContainer,
    VersionListTable,
    VersionNumberCell,
    VersionDateCell,
    LoadingOverlay,
    VersionHeaderCell
} from '../../components/styles';
import { TransactionVersionDialog } from './TransactionVersionDialog';
import { StyledTableCell } from '../../components/styles';
import { VersionChangesCell } from '../../components/VersionChangesCell';

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

    const versionsByNumber = useMemo(() => new Map(versions.map(v => [v.version, v])), [versions]);

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

                            <VersionChangesCell
                                version={version.version}
                                diff={version.diff}
                                priorData={versionsByNumber.get(version.version - 1)?.data}
                                currentData={version.data}
                            />
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