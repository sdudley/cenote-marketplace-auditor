import {
    Box,
    Typography,
    TableCell,
    styled,
    Container,
    Drawer,
    AppBar,
    TableContainer as MuiTableContainer,
    Table,
    TableRow,
    Paper,
    IconButton,
    TableHead,
    TableBody
} from '@mui/material';

export const drawerWidth = 240;

export const KeyColumn = styled(Box)({
    width: '250px',
    textAlign: 'left',
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
    fontWeight: 'bold',
    color: '#881391',
    marginRight: '8px',
    userSelect: 'none'
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
    paddingTop: theme.spacing(3),
    marginLeft: 0,
    marginRight: 0,
    height: 'calc(100vh - 64px)', // Changed from minHeight to height
    width: 'calc(100% - 240px)',
    maxWidth: 'calc(100% - 240px)',
    overflow: 'auto'  // Changed back to just 'auto'
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
    flex: 1,
    overflow: 'hidden'
});

export const StyledDrawer = styled(Drawer)({
    width: drawerWidth,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
        width: drawerWidth,
        boxSizing: 'border-box',
        position: 'fixed',
        top: '64px', // AppBar height
        height: 'calc(100vh - 64px)', // Subtract AppBar height
        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
    },
});

export const ContentContainer = styled(Container)({
    className: 'content-container',
    width: '100%',
    maxWidth: '100% !important',
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 0,
    marginTop: 0,
    paddingTop: 0,
    '&.MuiContainer-root': {
        paddingLeft: 0,
        paddingRight: 0
    }
});

export const ContentBoxWrapper = styled(Box)(({ theme }) => ({
    width: '100%',
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 0
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
    maxWidth: '100%',
    position: 'relative',
    height: 'calc(100vh - 280px - 16px)', // Increased to 16px to ensure full scrollbar visibility
    marginBottom: 0
});

export const StyledTableContainer = styled(MuiTableContainer)({
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    height: '100%',
    marginBottom: 0,
    '&::-webkit-scrollbar': {
        width: '8px',
        height: '8px'
    },
    '&::-webkit-scrollbar-track': {
        background: '#f1f1f1'
    },
    '&::-webkit-scrollbar-thumb': {
        background: '#888',
        borderRadius: '4px'
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: '#555'
    }
});

export const PaginationWrapper = styled(Box)({
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'white',
    borderTop: '1px solid rgba(224, 224, 224, 1)',
    padding: '8px 0',
    zIndex: 2,
    marginBottom: 0
});

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
    position: 'sticky',
    top: 0,
    zIndex: 2,
    backgroundColor: theme.palette.background.paper,
    '& th': {
        backgroundColor: theme.palette.background.paper,
        borderBottom: `2px solid ${theme.palette.divider}`
    }
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
    cursor: 'pointer',
    '&:hover': {
        backgroundColor: theme.palette.action.hover
    }
}));

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
    padding: '8px'
}));

export const SearchContainer = styled(Box)({
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center'
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
    padding: '16px 16px 0 16px'
});

export const VisibilityCell = styled(TableCell)({
    width: 40,
    padding: 0
});

export const VersionListContainer = styled(Box)({
    width: '100%',
    marginTop: 16
});

export const VersionListTable = styled(Table)({
    width: '100%'
});

export const VersionNumberCell = styled(StyledTableCell)({
    width: '100px',
    fontWeight: 'bold'
});

export const VersionDateCell = styled(StyledTableCell)({
    width: '200px',
    whiteSpace: 'nowrap'
});

export const VersionDiffCell = styled(StyledTableCell)({
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap'
});

export const VersionHeaderCell = styled(StyledTableCell)({
    fontWeight: 'bold'
});

export const VersionDataBox = styled(Box)({
    marginTop: 16
});

export const TreeContainer = styled(Box)({
    padding: '8px',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#333',
});

export const TreeValue = styled(Typography)({
    color: '#1A1AA6',
    userSelect: 'none',
}) as typeof Typography;

export const TreeValueOld = styled(TreeValue)({
    color: '#A61A1A',
    textDecoration: 'line-through',
    marginRight: '8px',
    fontWeight: 'bold'
}) as typeof Typography;

export const TreeValueNew = styled(TreeValue)({
    color: '#1AA61A',
    fontWeight: 'bold'
}) as typeof Typography;

export const TreeToggle = styled(Box)({
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    width: '20px',
    height: '20px',
});

export const TreeBorder = styled(Box)({
    border: '1px solid gainsboro',
    padding: '8px'
});

export const StyledListPaper = styled(Paper)({
    width: '100%',
    position: 'relative',
    boxShadow: 'none'
});

export const TableCellNoWrap = styled(StyledTableCell)({
    whiteSpace: 'nowrap'
});

export const TableCellCheckbox = styled(TableCell)({
    width: 48,
    padding: '0 8px',
    textAlign: 'center',
    '& .MuiSvgIcon-root': {
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            transform: 'scale(1.1)',
            opacity: 0.8
        }
    }
});

export const TableHeaderCell = styled(TableCell)({
    fontWeight: 'bold'
});

export const EmphasizedAnnotation = styled('p')({
    color: '#f58623',
    fontStyle: 'italic',
    fontWeight: 'bold',
    fontSize: '10px'
});

export const VersionButton = styled(Box)({
    position: 'absolute',
    right: 48,
    top: 8
});

export const FilterContainer = styled(Box)({
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center'
});

export const FilterLabel = styled(Typography)({
    fontWeight: 500,
    marginRight: 8,
    whiteSpace: 'nowrap'
}) as typeof Typography;

export const ReconciliationStatus = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    '&.automatic': {
        color: theme.palette.success.main
    },
    '&.manual': {
        color: theme.palette.secondary.main
    },
    '&.unreconciled': {
        color: theme.palette.error.main
    }
})) as typeof Typography;

export const AmountMismatch = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    color: theme.palette.error.main
})) as typeof Typography;

export const ReconciliationGrid = styled(Box)({
    display: 'grid',
    gridTemplateColumns: '150px 1fr 150px 1fr',
    gap: 8,
    marginBottom: 16
});

export const AmountsBox = styled(Box)({
    display: 'grid',
    gridTemplateColumns: '150px 1fr 150px 1fr',
    gap: 8,
    marginBottom: 16
});

export const NotesList = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16
});

export const NoteRow = styled(Box)({
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 16,
    alignItems: 'center'
});

export const DialogTitleBox = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: 4
});

export const DialogTitleSubtitle = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.secondary
}));

export const NotesHeadingBox = styled(Box)(({ theme }) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1)
}));

export const NotesSectionBox = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(3)
}));

export const StatusDot = styled(Box)({
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    cursor: 'default'
});

export const StatusControlsBox = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'flex-end'
});

export const HoverActions = styled(Box)({
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out',
    '&:hover': {
        opacity: 1
    },
    '&:hover, .MuiTableRow-root:hover &': {
        opacity: 1
    }
});

export const StatusIconButton = styled(IconButton)({
    padding: 0.5,
    '& .MuiSvgIcon-root': {
        fontSize: 16
    },
    '&:hover': {
        '& .MuiSvgIcon-root': {
            color: 'inherit'
        }
    }
});

export const ReconcileButton = styled(StatusIconButton)({
    '&:hover': {
        '& .MuiSvgIcon-root': {
            color: '#4CAF50'
        }
    }
});

export const UnreconcileButton = styled(StatusIconButton)({
    '&:hover': {
        '& .MuiSvgIcon-root': {
            color: '#F44336'
        }
    }
});

export const ReconciliationHeaderCell = styled(TableHeaderCell)(({ theme }) => ({
    padding: '0 8px 0 16px',
    position: 'sticky',
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
    '&::after': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '1px',
        backgroundColor: 'rgba(224, 224, 224, 1)'
    }
}));

export const StatusCell = styled(TableCell)(({ theme }) => ({
    padding: '0 8px 0 16px',
    cursor: 'default',
    textAlign: 'right',
    position: 'sticky',
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 1,
    width: '80px',
    '&::after': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '1px',
        backgroundColor: 'rgba(224, 224, 224, 1)'
    }
}));

export const StyledTable = styled(Table)({
    //tableLayout: 'fixed',
    //width: '100%'
});

export const StyledTableBody = styled(TableBody)({
    '& tr:last-child td': {
        borderBottom: 0
    }
});

export const WrappedLabel = styled('span')({
    lineHeight: '18px'
});