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
    TouchSensor,
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

// T = item type for row
// C = context type for cell rendering
// S = sort type for sorting

export interface ColumnConfig<T extends any, C extends any, S extends any> {
    id: string;
    label: string | React.ReactNode;
    visible: boolean;
    nowrap?: boolean;
    align?: 'left' | 'center' | 'right';
    tooltip?: string;
    sortField?: S; // The enum value for sorting - presence determines if sortable
    renderSimpleCell?: (item: T, context: C) => React.ReactNode; // For simple content
    renderFullCell?: (item: T, context: C) => React.ReactNode; // For complex custom rendering
    renderFullHeader?: () => React.ReactNode; // For custom header rendering
}

interface ColumnConfigDialogProps<T = any, C = any, S = any> {
    open: boolean;
    onClose: () => void;
    columns: ColumnConfig<T, C, S>[];
    onColumnsChange: (columns: ColumnConfig<T, C, S>[]) => void;
    title: string;
    isLoaded?: boolean;
}

interface SortableColumnItemProps<T = any, C = any, S = any> {
    column: ColumnConfig<T, C, S>;
    onToggleVisibility: (columnId: string) => void;
}

const SortableColumnItem = <T extends any, C extends any>({ column, onToggleVisibility }: SortableColumnItemProps<T, C>) => {
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

        // Extract text content from ReactNode
        const extractText = (node: React.ReactNode): string => {
            if (typeof node === 'string') {
                return node;
            }
            if (typeof node === 'number') {
                return node.toString();
            }
            if (React.isValidElement(node)) {
                const children = React.Children.toArray(node.props.children);
                return children.map(extractText).join(' ');
            }
            return '';
        };

        return extractText(label).replace(/\s+/g, ' ').trim();
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
                    p: 0.25,
                    borderRadius: 0.5,
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                    // Let touch start drag instead of scroll (dnd-kit TouchSensor uses delay to disambiguate)
                    touchAction: 'none',
                    // At least 44px touch target so the grab handle is easy to hit on mobile
                    minWidth: 44,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <DragIndicator color="action" fontSize="small" />
            </Box>
        </ListItem>
    );
};

export const ColumnConfigDialog = <T extends any, C extends any, S extends any>({
    open,
    onClose,
    columns,
    onColumnsChange,
    title,
    isLoaded = true
}: ColumnConfigDialogProps<T, C, S>) => {
    const [localColumns, setLocalColumns] = useState<ColumnConfig<T, C, S>[]>(columns);

    // Update local columns when the prop changes (after loading)
    useEffect(() => {
        if (isLoaded) {
            setLocalColumns(columns);
        }
    }, [columns, isLoaded]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
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