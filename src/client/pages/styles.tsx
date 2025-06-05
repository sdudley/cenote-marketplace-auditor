import { styled as muiStyled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const PageContainer = muiStyled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
    marginLeft: 0,
    paddingLeft: 0,
    marginTop: 0,
    paddingTop: 0
}));

export const PageTitle = muiStyled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(3),
}));