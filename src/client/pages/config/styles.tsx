import { styled as muiStyled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const DemoModeContainer = muiStyled(Box)(() => ({
    marginTop: 16,
    marginBottom: 16
}));

export const SlackContainer = muiStyled(Box)(() => ({
    marginTop: 0,
    paddingTop: 0,
    marginBottom: 0,
    paddingBottom: 0
}));