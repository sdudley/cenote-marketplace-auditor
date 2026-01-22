import React, { useState, useEffect } from 'react';
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
    PlayArrow,
    Logout as LogoutIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import { Button, Box } from '@mui/material';
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
import { UserType, isAdmin } from './util/userUtils';

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
    const [userType, setUserType] = useState<string>(UserType.User);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const response = await fetch('/api/auth/status', { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated) {
                        setUserType(data.user.userType || UserType.User);
                    }
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        };
        checkAdminStatus();
    }, []);

    const baseMenuItems = [
        { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
        { text: 'Licenses', icon: <CardMembershipIcon />, path: '/licenses' },
        { text: 'Configuration', icon: <SettingsIcon />, path: '/config' },
        { text: 'Tasks', icon: <PlayArrow />, path: '/tasks' }
    ];

    const adminMenuItems = isAdmin(userType)
        ? [{ text: 'Users', icon: <PeopleIcon />, path: '/users' }]
        : [];

    const menuItems = [...baseMenuItems, ...adminMenuItems];

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            // Still navigate to login even if logout request fails
            navigate('/login', { replace: true });
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RootBox>
                <StyledAppBar position="fixed">
                    <Toolbar>
                        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                            Cenote Marketplace Auditor
                        </Typography>
                        <Button
                            color="inherit"
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            sx={{ textTransform: 'none' }}
                        >
                            Logout
                        </Button>
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