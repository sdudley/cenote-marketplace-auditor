import { Box, Typography, TableCell, styled } from '@mui/material';

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

export const TableWrapper = styled(Box)({
    position: 'relative',
    width: '100%',
    overflow: 'auto'
});

export const StyledTableContainer = styled(Box)({
    width: '100%',
    overflow: 'auto'
});

export const SortArrows = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    '& > svg': {
        fontSize: '0.75rem',
        margin: '-2px 0'
    }
});