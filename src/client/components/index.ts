import { styled } from '@mui/material/styles';
import { AppBar, Box, Drawer, Container } from '@mui/material';

const drawerWidth = 240;

export const RootBox = styled(Box)({
    display: 'flex',
});

export const StyledAppBar = styled(AppBar)(({ theme }) => ({
    zIndex: theme.zIndex.drawer + 1,
}));

export const ContentBox = styled(Box)({
    display: 'flex',
    flexGrow: 1,
});

export const StyledDrawer = styled(Drawer)({
    width: drawerWidth,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
        width: drawerWidth,
        boxSizing: 'border-box',
    },
});

export const Main = styled('main')(({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    marginTop: theme.spacing(8),
}));

export const ContentContainer = styled(Container)({
    height: '100%',
});

export const ContentBoxWrapper = styled(Box)({
    height: '100%',
});