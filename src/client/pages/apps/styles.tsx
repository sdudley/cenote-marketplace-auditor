import { styled } from '@mui/material/styles';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Paper,
    TableCell,
    TextField,
    Typography
} from '@mui/material';

export const AppsListContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
}));

export const AppsTablePaper = styled(Paper)({
    width: '100%',
    overflow: 'hidden'
});

export const AppsTableHeadCell = styled(TableCell)(({ theme }) => ({
    fontWeight: 700,
    backgroundColor: theme.palette.grey[100]
}));

export const AppsErrorAlert = styled(Alert)({});

export const EmptyStateText = styled(Typography)(({ theme }) => ({
    padding: theme.spacing(3),
    textAlign: 'center'
})) as typeof Typography;

export const LoadingContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4)
}));

export const DateField = styled(TextField)({
    minWidth: 165
});

export const ForgeToggle = styled(FormControlLabel)(({ theme }) => ({
    margin: 0,
    whiteSpace: 'nowrap',
    '& .MuiFormControlLabel-label': {
        fontSize: theme.typography.body2.fontSize
    }
}));

export const ForgeCheckbox = styled(Checkbox)({
    padding: 4
});

export const ActionsCell = styled(TableCell)({
    whiteSpace: 'nowrap'
});

export const ActionButtons = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1)
}));

export const SmallActionButton = styled(Button)({
    minWidth: 72
});
