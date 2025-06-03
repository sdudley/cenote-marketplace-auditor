import { Box, Container, Drawer, AppBar, styled, TableContainer as MuiTableContainer, Paper } from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

export const drawerWidth = 240;

export const Main = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginLeft: 0,
  paddingLeft: 0,
  marginTop: 0,
  paddingTop: 0,
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
  marginLeft: 0,
  paddingLeft: 0
});

export const ContentBox = styled(Box)({
  display: 'flex',
  marginTop: '64px',
  marginLeft: 0,
  paddingLeft: 0,
  flex: 1
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
  marginLeft: 0,
  paddingLeft: 0
});

export const ContentContainer = styled(Container)({
  className: 'content-container',
  width: '100%',
  maxWidth: '100% !important',
  marginLeft: 0,
  paddingLeft: 0,
  marginTop: 0,
  paddingTop: 0
});

export const ContentBoxWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
  marginLeft: 0,
  paddingLeft: 0
}));

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

export const SortArrows = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.action.disabled,
    marginLeft: theme.spacing(0.5),
    '& .MuiSvgIcon-root': {
        fontSize: 12,
    },
    '& .MuiSvgIcon-root:first-of-type': {
        marginRight: -4,
    },
}));

export const TableWrapper = styled(Box)(({ theme }) => ({
    width: '100%',
    minWidth: '1024px',
    overflowX: 'auto'
}));

export const StyledTableContainer = styled(MuiTableContainer)({
    position: 'relative',
    minHeight: 400,
    width: '100%'
});