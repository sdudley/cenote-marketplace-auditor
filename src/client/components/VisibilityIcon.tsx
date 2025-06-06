import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { VisibilityCell } from './styles';

interface VisibilityIconProps {
    onViewDetails: () => void;
}

export const VisibilityIcon: React.FC<VisibilityIconProps> = ({ onViewDetails }) => (
    <VisibilityCell>
        <Tooltip title="View Details">
            <IconButton
                size="small"
                onClick={() => onViewDetails()}
            >
                <Visibility fontSize="small" />
            </IconButton>
        </Tooltip>
    </VisibilityCell>
);