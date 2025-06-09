import { styled as muiStyled } from '@mui/material/styles';
import { Box, ListItemButton } from '@mui/material';

export const PageContainer = muiStyled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.background.default,
    //minHeight: '100vh',
    margin: 0,
    padding: 0
}));

export const PageTitle = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(3),
}));

export const StyledListItemButton = muiStyled(ListItemButton)(({ theme }) => ({
    '&.Mui-selected': {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
        },
    },
}));