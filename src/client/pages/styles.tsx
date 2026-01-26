import { styled as muiStyled } from '@mui/material/styles';
import { Box, ListItemButton, Typography, Link } from '@mui/material';

export const PageContainer = muiStyled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.background.default,
    margin: 0,
    padding: 0,
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(1),
    },
}));

export const PageTitle = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    paddingLeft: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
        marginBottom: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
}));

export const StyledListItemButton = muiStyled(ListItemButton)(({ theme }) => ({
    '&.Mui-selected': {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
        },
    },
}));

export const ConfigPageTitle = muiStyled(Typography)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
})) as typeof Typography;

export const ConfigFormContainer = muiStyled(Box)(({ theme }) => ({
    maxWidth: 900,
    margin: '0 auto',
    padding: theme.spacing(3),
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
    },
}));

export const ConfigFormFields = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(4),
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
        gap: theme.spacing(2),
    },
}));

export const ConfigColumn = muiStyled(Box)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    maxWidth: 400,
    [theme.breakpoints.down('md')]: {
        maxWidth: '100%',
    },
}));

export const ConfigSaveButtonContainer = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(2),
}));

export const LoadingContainer = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
}));

export const SchedulerContainer = muiStyled(Box)(({ theme }) => ({
    marginTop: 0,
    paddingTop: 0,
    marginBottom: 0,
    paddingBottom: 0
}));

export const StyledLink = muiStyled(Link)(({ theme }) => ({
    color: 'inherit',
    textDecoration: 'underline',
}));

export const PricingDetailList = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2)
}));

export const PricingDetailItem = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing(2)
}));

export const PricingDetailDescription = muiStyled(Typography)(({ theme }) => ({
    flex: 1,
    lineHeight: 1.4
})) as typeof Typography;

export const PricingDetailSubtotal = muiStyled(Typography)(({ theme }) => ({
    minWidth: '80px',
    textAlign: 'right',
    color: theme.palette.primary.main
})) as typeof Typography;
