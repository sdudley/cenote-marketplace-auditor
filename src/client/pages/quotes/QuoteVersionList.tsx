import React, { useState, useEffect, useMemo } from 'react';
import {
    TableBody,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
} from '@mui/material';
import { QuoteVersion } from '#common/entities/QuoteVersion.js';
import {
    VersionListContainer,
    VersionListTable,
    VersionNumberCell,
    VersionDateCell,
    LoadingOverlay,
    VersionHeaderCell
} from '../../components/styles';
import { StyledTableCell } from '../../components/styles';
import { QuoteVersionDialog } from './QuoteVersionDialog';
import { VersionChangesCell } from '../../components/VersionChangesCell';

interface QuoteVersionListProps {
    quoteId: string;
}

export const QuoteVersionList: React.FC<QuoteVersionListProps> = ({ quoteId }) => {
    const [versions, setVersions] = useState<QuoteVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<QuoteVersion | null>(null);
    const [priorVersion, setPriorVersion] = useState<QuoteVersion | null>(null);

    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            setErrorMessage(null);
            setVersions([]);
            try {
                const response = await fetch(`/api/quotes/${quoteId}/versions`);
                const data = await response.json();
                if (!response.ok) {
                    const message = typeof data?.error === 'string'
                        ? data.error
                        : `Failed to load quote versions (HTTP ${response.status})`;
                    setErrorMessage(message);
                    return;
                }
                if (!Array.isArray(data)) {
                    setErrorMessage('Unexpected response from server');
                    return;
                }
                setVersions(data);
            } catch (error) {
                console.error('Error fetching quote versions:', error);
                setErrorMessage('Failed to load quote versions');
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [quoteId]);

    const versionsByNumber = useMemo(() => new Map(versions.map(v => [v.version, v])), [versions]);

    const handleRowClick = (version: QuoteVersion) => {
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
                        <VersionHeaderCell>Quote Changes</VersionHeaderCell>
                        <VersionHeaderCell>Details Changes</VersionHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading && (
                        <TableRow>
                            <StyledTableCell colSpan={4}>
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

                            <VersionChangesCell
                                version={version.version}
                                diff={version.diffQuote}
                                priorData={versionsByNumber.get(version.version - 1)?.data}
                                currentData={version.data}
                            />

                            <VersionChangesCell
                                version={version.version}
                                diff={version.diffDetails}
                                priorData={versionsByNumber.get(version.version - 1)?.details}
                                currentData={version.details}
                            />
                        </TableRow>
                    ))}
                </TableBody>
            </VersionListTable>

            <QuoteVersionDialog
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
