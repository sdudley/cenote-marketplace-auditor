import React from 'react';
import { JsonDiffObject, JsonDelta } from '../../common/utils/objectDiff';
import { Box } from '@mui/material';
import { ChevronRight, ExpandMore } from '@mui/icons-material';
import {
    TreeContainer,
    TreeItem,
    TreeRow,
    TreeKey,
    TreeValueContainer,
    TreeValueOld,
    TreeValueNew,
    TreeToggle
} from './styles';

interface JsonDiffObjectTreeViewProps {
    data: JsonDiffObject;
    initialExpanded?: boolean;
}

export const JsonDiffObjectTreeView: React.FC<JsonDiffObjectTreeViewProps> = ({
    data,
    initialExpanded = true
}) => {
    const [expanded, setExpanded] = React.useState<{ [key: string]: boolean }>({});

    const toggleExpand = (key: string) => {
        setExpanded(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderValue = (value: any): string => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const renderDelta = (key: string, delta: JsonDelta) => {
        const isExpanded = expanded[key] ?? initialExpanded;
        const hasChildren = delta.children && Object.keys(delta.children).length > 0;

        return (
            <TreeItem key={key}>
                <TreeRow>
                    {hasChildren && (
                        <TreeToggle onClick={() => toggleExpand(key)}>
                            {isExpanded ? <ExpandMore /> : <ChevronRight />}
                        </TreeToggle>
                    )}
                    <TreeKey>{key}:</TreeKey>
                    {!hasChildren && (
                        <TreeValueContainer>
                        { delta.changeType==='changed'
                        ? <>
                            {delta.oldValue !== undefined && (
                                <TreeValueOld>{renderValue(delta.oldValue)}</TreeValueOld>
                            )}
                            {delta.newValue !== undefined && (
                                <TreeValueNew>{renderValue(delta.newValue)}</TreeValueNew>
                            )}
                        </>
                        : renderValue(delta.newValue)
                        }
                        </TreeValueContainer>
                    )}
                </TreeRow>
                {hasChildren && isExpanded && (
                    <Box>
                        {Object.entries(delta.children!).map(([childKey, childDelta]) =>
                            renderDelta(childKey, childDelta)
                        )}
                    </Box>
                )}
            </TreeItem>
        );
    };

    return (
        <TreeContainer>
            {Object.entries(data).map(([key, delta]) => renderDelta(key, delta))}
        </TreeContainer>
    );
};