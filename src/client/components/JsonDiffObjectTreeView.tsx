import React from 'react';
import { JsonDiffObject, JsonDelta } from '../../common/utils/objectDiff';
import { Box } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
    TreeContainer,
    TreeValueOld,
    TreeValueNew,
    LabelContainer,
    KeyColumn,
    JsonKey,
    JsonValue,
    ValueColumn
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

    const renderValue = (value: any): string => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `${value}`;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const renderDelta = (key: string, delta: JsonDelta) => {
        const isExpanded = expanded[key] ?? initialExpanded;
        const hasChildren = delta.children && Object.keys(delta.children).length > 0;

        const label = (
            <LabelContainer>
                <KeyColumn>
                    <JsonKey component="span">
                        {key}:
                    </JsonKey>
                </KeyColumn>
                <ValueColumn>
                    {typeof delta.newValue !== 'object' && (
                        <JsonValue>
                            {!hasChildren && (
                            <>
                                { delta.changeType==='changed'
                                ? <>
                                    {delta.oldValue !== undefined && (
                                        <TreeValueOld component="span">{renderValue(delta.oldValue)}</TreeValueOld>
                                    )}
                                    {delta.newValue !== undefined && (
                                        <TreeValueNew component="span">{renderValue(delta.newValue)}</TreeValueNew>
                                    )}
                                </>
                                : renderValue(delta.newValue)
                                }
                            </>
                            )}
                        </JsonValue>
                    )}
                </ValueColumn>
            </LabelContainer>
        );

        return (
            <TreeItem key={key} label={label} itemId={key}>
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