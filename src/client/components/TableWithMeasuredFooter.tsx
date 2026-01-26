import React, { useRef, useLayoutEffect, useState } from 'react';
import { TableAndFooterWrapper } from './styles';

interface TableWithMeasuredFooterProps {
    table: React.ReactNode;
    footer: React.ReactNode;
}

/**
 * Wraps table + footer so the footer gets minWidth = table.scrollWidth. This extends the footer
 * bar to the right edge of the table when scrolled, without changing the table's layout or wrapping.
 */
export function TableWithMeasuredFooter({ table, footer }: TableWithMeasuredFooterProps) {
    const tableRef = useRef<HTMLDivElement | null>(null);
    const [tableWidth, setTableWidth] = useState(0);

    useLayoutEffect(() => {
        const wrapper = tableRef.current;
        if (!wrapper) return;
        const tableEl = wrapper.querySelector('table');
        if (!tableEl) return;

        const update = () => setTableWidth(tableEl.scrollWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(tableEl);
        return () => ro.disconnect();
    }, [table]);

    const footerWithWidth =
        React.isValidElement(footer) && footer.props
            ? React.cloneElement(footer as React.ReactElement<{ sx?: object }>, {
                  sx: { minWidth: tableWidth || undefined, ...(footer.props.sx || {}) },
              })
            : footer;

    return (
        <TableAndFooterWrapper>
            <div ref={tableRef} style={{ width: '100%' }}>
                {table}
            </div>
            {footerWithWidth}
        </TableAndFooterWrapper>
    );
}
