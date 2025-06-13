import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Typography,
    List,
    ListItemIcon,
    ListItemText,
    Toolbar,
    CssBaseline,
    ThemeProvider,
    createTheme
} from '@mui/material';
import {
    Receipt as ReceiptIcon,
    CardMembership as CardMembershipIcon,
    Settings as SettingsIcon,
    PlayArrow
} from '@mui/icons-material';
import {
    Main,
    StyledAppBar,
    RootBox,
    ContentBox,
    StyledDrawer,
    ContentContainer,
    ContentBoxWrapper,
} from './components/styles';
import { StyledListItemButton } from './pages/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
    },
});

export const PageLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const menuItems = [
        { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
        { text: 'Licenses', icon: <CardMembershipIcon />, path: '/licenses' },
        { text: 'Configuration', icon: <SettingsIcon />, path: '/config' },
        { text: 'Tasks', icon: <PlayArrow />, path: '/tasks' }
    ];

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RootBox>
                <StyledAppBar position="fixed">
                    <Toolbar>
                        <Typography variant="h6" noWrap component="div">
                            Cenote Marketplace Auditor
                        </Typography>
                    </Toolbar>
                </StyledAppBar>
                <ContentBox>
                    <StyledDrawer
                        variant="permanent"
                        anchor="left"
                    >
                        <List>
                            {menuItems.map((item) => (
                                <StyledListItemButton
                                    key={item.text}
                                    onClick={() => navigate(item.path)}
                                    selected={location.pathname.startsWith(item.path)}
                                >
                                    <ListItemIcon sx={{
                                        color: location.pathname.startsWith(item.path) ? 'primary.main' : 'inherit'
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        sx={{
                                            color: location.pathname.startsWith(item.path) ? 'primary.main' : 'inherit'
                                        }}
                                    />
                                </StyledListItemButton>
                            ))}
                        </List>
                    </StyledDrawer>
                    <Main>
                        <ContentContainer>
                            <ContentBoxWrapper>
                                <Outlet />
                            </ContentBoxWrapper>
                        </ContentContainer>
                    </Main>
                </ContentBox>
            </RootBox>
        </ThemeProvider>
    );
};