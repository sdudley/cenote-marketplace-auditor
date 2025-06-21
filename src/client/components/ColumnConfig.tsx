import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Checkbox,
    Box,
    Typography,
} from '@mui/material';
import { Visibility, VisibilityOff, DragIndicator } from '@mui/icons-material';
import { CloseButton } from './CloseButton';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TransactionResult } from '#common/types/apiTypes';

export interface ColumnConfig {
    id: string;
    label: string | React.ReactNode;
    visible: boolean;
    nowrap?: boolean;
    align?: 'left' | 'center' | 'right';
    tooltip?: string;
    sortField?: any; // The enum value for sorting - presence determines if sortable
    renderSimpleCell?: (transaction: TransactionResult, context?: any) => React.ReactNode; // For simple content
    renderFullCell?: (transaction: TransactionResult, context?: any) => React.ReactNode; // For complex custom rendering
    renderFullHeader?: () => React.ReactNode; // For custom header rendering
}

interface ColumnConfigDialogProps {
    open: boolean;
    onClose: () => void;
    columns: ColumnConfig[];
    onColumnsChange: (columns: ColumnConfig[]) => void;
    title: string;
    isLoaded?: boolean;
}

interface SortableColumnItemProps {
    column: ColumnConfig;
    onToggleVisibility: (columnId: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({ column, onToggleVisibility }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Convert React node labels to plain text for display
    const getDisplayLabel = (label: string | React.ReactNode): string => {
        if (typeof label === 'string') {
            return label;
        }
        // For React nodes, extract text content and replace <br> with space
        if (React.isValidElement(label)) {
            const textContent = React.Children.toArray(label.props.children)
                .map(child => {
                    if (typeof child === 'string') {
                        return child;
                    }
                    if (React.isValidElement(child) && child.type === 'br') {
                        return ' ';
                    }
                    return '';
                })
                .join('')
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim();
            return textContent;
        }
        return '';
    };

    const displayLabel = getDisplayLabel(column.label);

    return (
        <ListItem
            ref={setNodeRef}
            style={style}
            {...attributes}
            sx={{
                py: 0.25, // Minimal padding
                px: 0.5,  // Minimal padding
                mb: 0.25, // Minimal margin
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
                backgroundColor: isDragging ? 'action.hover' : 'transparent',
                borderRadius: 0.5,
                '&:hover': {
                    backgroundColor: 'action.hover',
                },
                minHeight: 'auto', // Remove minimum height
            }}
        >
            <ListItemIcon sx={{ minWidth: 28 }}> {/* Even smaller */}
                <Checkbox
                    checked={column.visible}
                    onChange={() => onToggleVisibility(column.id)}
                    icon={<VisibilityOff />}
                    checkedIcon={<Visibility />}
                    size="small"
                />
            </ListItemIcon>

            <ListItemText
                primary={displayLabel}
                primaryTypographyProps={{ variant: 'body2' }}
                sx={{ my: 0 }} // Remove vertical margin
            />

            <Box
                {...listeners}
                sx={{
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' },
                    p: 0.25, // Minimal padding
                    borderRadius: 0.5,
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                }}
            >
                <DragIndicator color="action" fontSize="small" />
            </Box>
        </ListItem>
    );
};

export const ColumnConfigDialog: React.FC<ColumnConfigDialogProps> = ({
    open,
    onClose,
    columns,
    onColumnsChange,
    title,
    isLoaded = true
}) => {
    const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

    // Update local columns when the prop changes (after loading)
    useEffect(() => {
        if (isLoaded) {
            setLocalColumns(columns);
        }
    }, [columns, isLoaded]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleToggleVisibility = (columnId: string) => {
        setLocalColumns(prev =>
            prev.map(col =>
                col.id === columnId
                    ? { ...col, visible: !col.visible }
                    : col
            )
        );
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setLocalColumns((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = () => {
        onColumnsChange(localColumns);
        onClose();
    };

    const handleCancel = () => {
        setLocalColumns(columns);
        onClose();
    };

    const handleSelectAll = () => {
        setLocalColumns(prev => prev.map(col => ({ ...col, visible: true })));
    };

    const handleSelectNone = () => {
        setLocalColumns(prev => prev.map(col => ({ ...col, visible: false })));
    };

    const visibleCount = localColumns.filter(col => col.visible).length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {title}
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent dividers sx={{ p: 1.5 }}>
                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {visibleCount} of {localColumns.length} columns visible
                    </Typography>
                    <Box>
                        <Button size="small" onClick={handleSelectAll} sx={{ mr: 1 }}>
                            Select All
                        </Button>
                        <Button size="small" onClick={handleSelectNone}>
                            Select None
                        </Button>
                    </Box>
                </Box>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={localColumns.map(col => col.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <List sx={{ p: 0 }}>
                            {localColumns.map((column) => (
                                <SortableColumnItem
                                    key={column.id}
                                    column={column}
                                    onToggleVisibility={handleToggleVisibility}
                                />
                            ))}
                        </List>
                    </SortableContext>
                </DndContext>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};