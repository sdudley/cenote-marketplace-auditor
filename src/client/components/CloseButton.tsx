import { IconButton } from "@mui/material";
import { Close as CloseIcon } from '@mui/icons-material';

export const CloseButton = ({ onClose }: { onClose: () => void }) => (
    <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
            position: 'absolute',
            right: 8,
            top: 8
        }}
    >
        <CloseIcon />
    </IconButton>
);