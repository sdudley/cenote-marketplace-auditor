import { styled as muiStyled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';

export const ApportionmentContent = muiStyled(Box)(({ theme }) => ({
    paddingLeft: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
}));

export const ApportionmentForm = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    flexWrap: 'wrap'
}));

export const ApportionmentResultsTable = muiStyled('table')(({ theme }) => ({
    width: 'auto',
    borderCollapse: 'collapse',
    fontSize: theme.typography.body2.fontSize,
    lineHeight: theme.typography.body2.lineHeight,
    '& th, & td': {
        padding: theme.spacing(0.75, 2),
        textAlign: 'left',
        borderBottom: `1px solid ${theme.palette.divider}`,
        whiteSpace: 'nowrap'
    },
    '& th:not(:last-child), & td:not(:last-child)': {
        paddingRight: theme.spacing(4)
    },
    '& th:last-child, & td:last-child, & th:nth-last-child(2), & td:nth-last-child(2)': {
        textAlign: 'right'
    },
    '& th': {
        fontWeight: 600,
        color: theme.palette.text.secondary
    },
    '& tfoot td': {
        fontWeight: 600,
        borderBottom: 'none'
    }
}));

export const EmptyTabContent = muiStyled(Box)(({ theme }) => ({
    padding: theme.spacing(4, 0),
    color: theme.palette.text.secondary
}));

export const ApportionmentSection = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4)
}));

export const ApportionmentSectionHeading = muiStyled(Typography)(({ theme }) => ({
    marginBottom: theme.spacing(1.5)
})) as typeof Typography;

export const ApportionmentAddonGroup = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    paddingLeft: theme.spacing(1),
    '& > .MuiTypography-root': {
        marginBottom: theme.spacing(1.25)
    }
}));

export const ApportionmentHostingGroup = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing(2)
}));
