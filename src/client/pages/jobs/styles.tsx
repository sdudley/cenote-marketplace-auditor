import { styled } from '@mui/material/styles';
import { Box, Button, Paper } from '@mui/material';

export const PageContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: '0 auto',
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
    },
}));

export const HeaderContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: theme.spacing(2),
    },
}));

export const JobList = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
}));

export const JobCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: theme.spacing(2),
    },
}));

export const JobInfo = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1)
}));

export const JobStatus = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
}));

/** Fixed-size slot so swapping the status icon (24px) for the spinner (20px) doesn't shift the row. */
export const StatusIconSlot = styled(Box)({
    width: 24,
    height: 24,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

export const StartAllButton = styled(Button)(({ theme }) => ({
    minWidth: 100,
    textTransform: 'none',
    alignSelf: 'flex-end',
    paddingRight: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
        alignSelf: 'stretch',
        marginRight: 0,
        width: '100%',
    },
}));

export const StartJobButton = styled(Button)(({ theme }) => ({
    minWidth: 100,
    textTransform: 'none',
    [theme.breakpoints.down('md')]: {
        width: '100%',
    },
}));