import { Box, styled } from '@mui/material';

export const ResponsiveSearchContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'center',

    // Search field - should be flexible but have a minimum width
    '& .search-field': {
        minWidth: '200px',
        flex: '1 1 200px',
        maxWidth: '300px',
    },

    // Filter label - should not wrap and stay compact
    '& .filter-label': {
        whiteSpace: 'nowrap',
        marginRight: '8px',
        fontWeight: 500,
    },

    // Filter dropdowns - should be flexible but have reasonable min/max widths
    '& .filter-dropdown': {
        minWidth: '150px',
        flex: '1 1 150px',
        maxWidth: '200px',
    },

    // Columns button - should not shrink and maintain its size
    '& .columns-button': {
        flexShrink: 0,
        whiteSpace: 'nowrap',
        padding: '6px 16px',
        minWidth: 'fit-content',
        '& .MuiButton-startIcon': {
            marginRight: '4px',
        },
    },

    // Responsive breakpoints
    [theme.breakpoints.down('lg')]: {
        gap: '10px',

        '& .search-field': {
            minWidth: '180px',
            flex: '1 1 180px',
            maxWidth: '280px',
        },

        '& .filter-dropdown': {
            minWidth: '140px',
            flex: '1 1 140px',
            maxWidth: '180px',
        },
    },

    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '12px',
        marginBottom: '12px',

        '& .search-field': {
            minWidth: 'unset',
            flex: '1 1 auto',
            maxWidth: 'unset',
        },

        '& .filter-dropdown': {
            minWidth: 'unset',
            flex: '1 1 auto',
            maxWidth: 'unset',
        },

        '& .columns-button': {
            alignSelf: 'flex-end',
        },
    },

    // Short viewport (e.g. mobile landscape): single row, minimal gaps so header scrolls away and table gets space
    '@media (max-height: 500px)': {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '6px',
        marginBottom: '6px',
        alignItems: 'center',

        '& .search-field': {
            flex: '1 1 140px',
            minWidth: '100px',
            '& .MuiInputBase-root': {
                fontSize: '0.875rem',
            },
        },

        '& .filter-label': {
            marginRight: '4px',
            fontSize: '0.8125rem',
        },

        '& .columns-button': {
            flexShrink: 0,
            padding: '4px 10px',
            fontSize: '0.8125rem',
        },
    },

    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '8px',

        '& .search-field': {
            minWidth: 'unset',
            flex: '1 1 auto',
            maxWidth: 'unset',
        },

        '& .filter-dropdown': {
            minWidth: 'unset',
            flex: '1 1 auto',
            maxWidth: 'unset',
        },

        '& .columns-button': {
            alignSelf: 'flex-end',
        },
    },

    // Extra small screens
    '@media (max-width: 480px)': {
        gap: '6px',

        '& .search-field': {
            minWidth: 'unset',
            flex: '1 1 auto',
            maxWidth: 'unset',
        },

        '& .filter-dropdown': {
            minWidth: 'unset',
            flex: '1 1 auto',
            maxWidth: 'unset',
        },

        '& .columns-button': {
            alignSelf: 'flex-end',
            padding: '4px 12px',
            fontSize: '0.875rem',
        },
    },
}));