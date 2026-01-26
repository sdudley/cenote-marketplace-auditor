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
    createTheme,
    Divider,
    IconButton,
    useMediaQuery
} from '@mui/material';
import {
    Receipt as ReceiptIcon,
    CardMembership as CardMembershipIcon,
    Settings as SettingsIcon,
    PlayArrow,
    Logout as LogoutIcon,
    People as PeopleIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import { Button, Box } from '@mui/material';
import {
    Main,
    StyledAppBar,
    RootBox,
    ContentBox,
    StyledDrawer,
    StyledMobileDrawer,
    ContentContainer,
    ContentBoxWrapper,
} from './components/styles';
import { StyledListItemButton } from './pages/styles';
import { UserType, isAdmin } from './util/userUtils';

const appTheme = createTheme({
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
    const isMobile = useMediaQuery(appTheme.breakpoints.down('md'));
    const [userType, setUserType] = useState<string>(UserType.User);
    const [mobileOpen, setMobileOpen] = useState(false);

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

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const dataMenuItems = [
        { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
        { text: 'Licenses', icon: <CardMembershipIcon />, path: '/licenses' },
    ];

    const systemMenuItems = [
        { text: 'Configuration', icon: <SettingsIcon />, path: '/config' },
        { text: 'Tasks', icon: <PlayArrow />, path: '/tasks' }
    ];

    const adminMenuItems = isAdmin(userType)
        ? [{ text: 'Users', icon: <PeopleIcon />, path: '/users' }]
        : [];

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

    const drawerContent = (
        <List>
            {dataMenuItems.map((item) => (
                <StyledListItemButton
                    key={item.text}
                    onClick={() => {
                        navigate(item.path);
                        if (isMobile) {
                            setMobileOpen(false);
                        }
                    }}
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
            {isAdmin(userType) && (
                <>
                    <Divider
                        sx={{
                            my: 2,
                            mx: 2,
                            borderBottomWidth: 2
                        }}
                    />
                    {systemMenuItems.map((item) => (
                        <StyledListItemButton
                            key={item.text}
                            onClick={() => {
                                navigate(item.path);
                                if (isMobile) {
                                    setMobileOpen(false);
                                }
                            }}
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
                    {adminMenuItems.map((item) => (
                        <StyledListItemButton
                            key={item.text}
                            onClick={() => {
                                navigate(item.path);
                                if (isMobile) {
                                    setMobileOpen(false);
                                }
                            }}
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
                </>
            )}
        </List>
    );

    return (
        <ThemeProvider theme={appTheme}>
            <CssBaseline />
            <RootBox>
                <StyledAppBar position="fixed">
                    <Toolbar>
                        {isMobile && (
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ mr: 2 }}
                            >
                                <MenuIcon />
                            </IconButton>
                        )}
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
                    {isMobile ? (
                        <StyledMobileDrawer
                            variant="temporary"
                            open={mobileOpen}
                            onClose={handleDrawerToggle}
                            ModalProps={{
                                keepMounted: true, // Better open performance on mobile.
                            }}
                        >
                            {drawerContent}
                        </StyledMobileDrawer>
                    ) : (
                        <StyledDrawer
                            variant="permanent"
                            anchor="left"
                        >
                            {drawerContent}
                        </StyledDrawer>
                    )}
                    <Main isMobile={isMobile}>
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