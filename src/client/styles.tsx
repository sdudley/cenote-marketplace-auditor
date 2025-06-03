import { Box, Container, Drawer, AppBar, styled } from '@mui/material';

export const drawerWidth = 240;

export const Main = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginLeft: 0,
  minHeight: 'calc(100vh - 64px)', // Subtract AppBar height
}));

export const StyledAppBar = styled(AppBar)({
  zIndex: 1201, // Higher than drawer's default z-index of 1200
});

export const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

export const RootBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
});

export const ContentBox = styled(Box)({
  display: 'flex',
  marginTop: '64px',
  flex: 1,
});

export const StyledDrawer = styled(Drawer)({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    position: 'relative',
    height: 'calc(100vh - 64px)', // Subtract AppBar height
  },
});

export const ContentContainer = styled(Container)({
  maxWidth: 'lg',
  marginLeft: 0
});

export const ContentBoxWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4)
}));