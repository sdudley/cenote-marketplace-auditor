import React from 'react';
import { Typography } from '@mui/material';
import { TransactionPricingResponse } from '#common/types/transactionPricing';
import { formatCurrency } from '#common/util/formatCurrency';
import {
    PricingDetailList,
    PricingDetailItem,
    PricingDetailDescription,
    PricingDetailSubtotal,
} from '../styles';
import { NotesHeadingBox } from '#client/components/styles.js';

interface TransactionPricingDetailProps {
    pricing: TransactionPricingResponse | null;
}

export const TransactionPricingDetail: React.FC<TransactionPricingDetailProps> = ({ pricing }) => {
    if (!pricing) {
        return null;
    }

    return (
        <>
            <NotesHeadingBox>
                <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                    Pricing Calculation Details
                </Typography>
            </NotesHeadingBox>

            <PricingDetailList>
                {pricing.descriptors.map((descriptor, index) => (
                    <PricingDetailItem key={index}>
                        <PricingDetailDescription variant="body2">
                            {descriptor.description}
                        </PricingDetailDescription>
                        {descriptor.subtotal !== undefined && (
                            <PricingDetailSubtotal variant="body2">
                                {formatCurrency(descriptor.subtotal)}
                            </PricingDetailSubtotal>
                        )}
                    </PricingDetailItem>
                ))}
                <PricingDetailItem key="final">
                    <PricingDetailDescription variant="body2" fontWeight="bold">Expected Amount:</PricingDetailDescription>
                    <PricingDetailSubtotal variant="body2" fontWeight="bold">
                        {formatCurrency(pricing.expectedAmount)}
                    </PricingDetailSubtotal>
                </PricingDetailItem>
            </PricingDetailList>
        </>
    );
};