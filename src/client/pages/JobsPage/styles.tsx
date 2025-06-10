import { styled } from '@mui/material/styles';
import { Box, Button, Paper } from '@mui/material';

export const PageContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: '0 auto'
}));

export const HeaderContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3)
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
    alignItems: 'center'
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

export const StartAllButton = styled(Button)(({ theme }) => ({
    minWidth: 100,
    textTransform: 'none',
    alignSelf: 'flex-end',
    paddingRight: theme.spacing(2),
    marginRight: theme.spacing(2)
}));

export const StartJobButton = styled(Button)(({ theme }) => ({
    minWidth: 100,
    textTransform: 'none'
}));