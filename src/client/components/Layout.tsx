import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
    Typography,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    CssBaseline,
    ThemeProvider,
    createTheme,
} from '@mui/material';
import {
    Receipt as ReceiptIcon,
    CardMembership as CardMembershipIcon,
    Verified as VerifiedIcon
} from '@mui/icons-material';
import {
    Main,
    StyledAppBar,
    RootBox,
    ContentBox,
    StyledDrawer,
    ContentContainer,
    ContentBoxWrapper,
} from '../styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
    },
});

export const Layout: React.FC = () => {
    const navigate = useNavigate();
    const menuItems = [
        { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
        { text: 'Licenses', icon: <CardMembershipIcon />, path: '/licenses' },
        { text: 'Validation', icon: <VerifiedIcon />, path: '/validation' },
    ];

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RootBox>
                <StyledAppBar position="fixed">
                    <Toolbar>
                        <Typography variant="h6" noWrap component="div">
                            Marketplace Auditor
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
                                <ListItemButton
                                    key={item.text}
                                    onClick={() => navigate(item.path)}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
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