import React, { useState } from 'react';
import {
    Box,
    Collapse,
    IconButton,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';

interface CollapsibleFiltersProps {
    children: React.ReactNode;
    label?: React.ReactNode;
}

export const CollapsibleFilters: React.FC<CollapsibleFiltersProps> = ({ children, label }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [expanded, setExpanded] = useState(false);

    if (!isMobile) {
        // On desktop, render label and children inline
        return (
            <>
                {label}
                {children}
            </>
        );
    }

    // On mobile, render as collapsible
    return (
        <Box
            sx={{
                width: '100%',
                // Short viewport: inline with search/columns, no extra margin
                '@media (max-height: 500px)': {
                    width: 'auto',
                    '& > div:first-of-type': { marginBottom: 0 },
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    '@media (max-height: 500px)': { mb: 0 },
                }}
            >
                <Box component="span" sx={{ fontWeight: 500, fontSize: '0.875rem', '@media (max-height: 500px)': { fontSize: '0.8125rem' } }}>
                    {label || 'Filters'}
                </Box>
                <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ padding: '4px', '@media (max-height: 500px)': { padding: '2px' } }}
                >
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>
            <Collapse in={expanded}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {children}
                </Box>
            </Collapse>
        </Box>
    );
};

