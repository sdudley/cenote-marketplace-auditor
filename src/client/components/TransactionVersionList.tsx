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

interface TransactionVersionListProps {
    transactionId: string;
}

export const TransactionVersionList: React.FC<TransactionVersionListProps> = ({ transactionId }) => {
    const [versions, setVersions] = useState<TransactionVersion[]>([]);
    const [loading, setLoading] = useState(false);

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
                        <TableRow key={version.id}>
                            <VersionNumberCell>{version.version}</VersionNumberCell>
                            <VersionDateCell>
                                {version.createdAt.toString().substring(0, 16).replace('T', ' ')}
                            </VersionDateCell>
                            <VersionDiffCell>{version.diff}</VersionDiffCell>
                        </TableRow>
                    ))}
                </TableBody>
            </VersionListTable>
        </VersionListContainer>
    );
};