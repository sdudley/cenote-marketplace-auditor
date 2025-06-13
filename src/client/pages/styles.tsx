import { styled as muiStyled } from '@mui/material/styles';
import { Box, ListItemButton, Typography, Link } from '@mui/material';

export const PageContainer = muiStyled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.background.default,
    margin: 0,
    padding: 0
}));

export const PageTitle = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    paddingLeft: theme.spacing(2),
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
}));

export const ConfigFormFields = muiStyled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(4),
}));

export const ConfigColumn = muiStyled(Box)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    maxWidth: 400,
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