import React from 'react';
import { Tooltip } from '@mui/material';
import { Check, Close, InfoOutlined } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { StatusDot, StatusControlsBox, StatusIconButton, ReconcileButton, UnreconcileButton, HoverActions } from '../styles';

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
    return (
        <StatusControlsBox>
            {transaction.transaction.reconcile?.reconciled ? (
                <Tooltip title={transaction.transaction.reconcile.automatic ? "Auto Reconciled" : "Manually Reconciled"}>
                    <StatusDot
                        sx={{
                            bgcolor: transaction.transaction.reconcile.automatic ? '#81C784' : '#4CAF50'
                        }}
                    />
                </Tooltip>
            ) : (
                <StatusDot />
            )}
            <HoverActions className="actions">
                {!transaction.transaction.reconcile?.reconciled ? (
                    <Tooltip title="Quick Reconcile">
                        <ReconcileButton
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickReconcile(transaction, true);
                            }}
                        >
                            <Check />
                        </ReconcileButton>
                    </Tooltip>
                ) : (
                    <Tooltip title="Quick Unreconcile">
                        <UnreconcileButton
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickReconcile(transaction, false);
                            }}
                        >
                            <Close />
                        </UnreconcileButton>
                    </Tooltip>
                )}
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
            </HoverActions>
        </StatusControlsBox>
    );
};