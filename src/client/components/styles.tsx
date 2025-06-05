import { Box, Typography, TableCell, styled, Container, Drawer, AppBar, TableContainer as MuiTableContainer } from '@mui/material';

export const drawerWidth = 240;

export const KeyColumn = styled(Box)({
    width: '220px',
    textAlign: 'right',
    paddingRight: '16px'
});

export const ValueColumn = styled(Box)({
    flexGrow: 1
});

export const LabelContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    width: '100%'
});

export const JsonValue = styled(Typography)({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
}) as typeof Typography;

export const JsonKey = styled(Typography)({
    fontWeight: 'bold'
}) as typeof Typography;

export const DialogContentBox = styled(Box)({
    maxHeight: '50vh',
    overflow: 'auto',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    padding: 16
});

export const StyledDialog = styled(Box)({
    minHeight: '80vh',
    maxHeight: '90vh'
});

export const InfoTableBox = styled(Box)({
    marginBottom: 24
});

export const InfoTableHeader = styled(TableCell)({
    fontWeight: 'bold'
});

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

export const TableWrapper = styled(Box)({
    width: '100%',
    minWidth: '1024px',
    overflowX: 'auto',
    paddingLeft: 40 // Add padding for the icon
});

export const StyledTableContainer = styled(MuiTableContainer)({
    position: 'relative',
    minHeight: 400,
    width: '100%'
});

export const SearchContainer = styled(Box)({
    display: 'flex',
    gap: 16,
    marginBottom: 16
});

export const LoadingOverlay = styled(Box)({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1
});

export const TableContainer = styled(Box)({
    width: '100%',
    padding: 16
});

export const VisibilityCell = styled(TableCell)({
    width: 40,
    padding: 0
});