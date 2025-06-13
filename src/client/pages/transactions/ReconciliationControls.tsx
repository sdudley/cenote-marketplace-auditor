import React from 'react';
import { Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { StatusDot, StatusControlsBox, StatusIconButton } from '../../components/styles';

interface ReconciliationControlsProps {
    transaction: TransactionResult;
    onQuickReconcile: (transaction: TransactionResult, reconciled: boolean) => void;
    onShowDetails: (transaction: TransactionResult) => void;
}

export const ReconciliationControls: React.FC<ReconciliationControlsProps> = ({
    transaction,
    onQuickReconcile,
    onShowDetails
}) => {
    const isReconciled = transaction.transaction.reconcile?.reconciled;
    const isAutomatic = transaction.transaction.reconcile?.automatic;

    return (
        <StatusControlsBox>
            <Tooltip title={isReconciled
                ? (isAutomatic ? "Auto Reconciled - Click to unreconcile" : "Manually Reconciled - Click to unreconcile")
                : "Unreconciled - Click to reconcile"
            }>
                <StatusDot
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickReconcile(transaction, !isReconciled);
                    }}
                    sx={{
                        bgcolor: isReconciled
                            ? (isAutomatic ? '#81C784' : '#4CAF50')
                            : '#E0E0E0',
                        cursor: 'pointer',
                        '&:hover': {
                            opacity: 0.8
                        }
                    }}
                />
            </Tooltip>
            <Tooltip title="Reconciliation Details">
                <StatusIconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        onShowDetails(transaction);
                    }}
                >
                    <InfoOutlined />
                </StatusIconButton>
            </Tooltip>
        </StatusControlsBox>
    );
};