import React, { useState } from 'react';
import { Typography, Tabs, Tab, Box } from '@mui/material';
import { PageContainer, PageTitle } from '../styles';
import { NewApportionmentTab } from './NewApportionmentTab';
import { SavedApportionmentsTab } from './SavedApportionmentsTab';
import { ApportionmentContent } from './styles';

export const ApportionmentPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <PageContainer>
            <PageTitle>
                <Typography variant="h4" component="h1">
                    Revenue Apportionment
                </Typography>
            </PageTitle>

            <ApportionmentContent>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="New Apportionment" />
                    <Tab label="Saved Apportionments" />
                </Tabs>

                <Box>
                    {activeTab === 0 && <NewApportionmentTab />}
                    {activeTab === 1 && <SavedApportionmentsTab />}
                </Box>
            </ApportionmentContent>
        </PageContainer>
    );
};
