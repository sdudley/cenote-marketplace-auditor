import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

interface PurchaseMonthPickerProps {
    value: Dayjs;
    onChange: (value: Dayjs) => void;
}

export const PurchaseMonthPicker: React.FC<PurchaseMonthPickerProps> = ({ value, onChange }) => {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label="Purchase month"
                views={['year', 'month']}
                openTo="month"
                value={value}
                onChange={(newValue) => {
                    if (newValue) {
                        onChange(newValue.startOf('month'));
                    }
                }}
                format="YYYY-MM"
                slotProps={{
                    textField: {
                        size: 'small',
                        placeholder: 'yyyy-mm'
                    }
                }}
            />
        </LocalizationProvider>
    );
};

export const getDefaultPurchaseMonth = (): Dayjs => dayjs().subtract(1, 'month').startOf('month');

export const purchaseMonthFromDayjs = (value: Dayjs): string => value.format('YYYY-MM');
