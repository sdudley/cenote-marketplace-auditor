import {
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
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
} from './components';

function App() {
  const menuItems = [
    { text: 'Transactions', icon: <ReceiptIcon /> },
    { text: 'Licenses', icon: <CardMembershipIcon /> },
    { text: 'Validation', icon: <VerifiedIcon /> },
  ];

  return (
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
              <ListItem key={item.text} component="div">
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </StyledDrawer>
        <Main>
          <ContentContainer>
            <ContentBoxWrapper>
              <Typography variant="h4" component="h1" gutterBottom>
                Marketplace Auditor
              </Typography>
              <Typography variant="body1">
                Select a section from the sidebar to begin.
              </Typography>
            </ContentBoxWrapper>
          </ContentContainer>
        </Main>
      </ContentBox>
    </RootBox>
  );
}

export default App;