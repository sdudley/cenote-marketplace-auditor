import React from 'react';
import { JsonDiffObject, JsonDelta } from '../../common/utils/objectDiff';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
    TreeContainer,
    TreeValueOld,
    TreeValueNew,
    LabelContainer,
    KeyColumn,
    JsonKey,
    JsonValue,
    ValueColumn,
    TreeBorder
} from './styles';
import { Box } from '@mui/material';

interface JsonDiffObjectTreeViewProps {
    data: JsonDiffObject;
}

export const JsonDiffObjectTreeView: React.FC<JsonDiffObjectTreeViewProps> = ({
    data
}) => {
    const renderValue = (value: any): string => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `${value}`;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const renderDelta = (key: string, delta: JsonDelta, parentKey: string = '') => {
        const hasChildren = delta.children && Object.keys(delta.children).length > 0;

        const fullKey = parentKey ? `${parentKey}.${key}` : key;

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

        const BorderObject = hasChildren ? TreeBorder : Box;

        return (
            <BorderObject key={fullKey}>
                <TreeItem label={label} itemId={fullKey}>
                    {hasChildren && (
                        Object.entries(delta.children!).map(([childKey, childDelta]) =>
                            renderDelta(childKey, childDelta, fullKey)
                        )
                    )}
                </TreeItem>
            </BorderObject>
        );
    };

    return (
        <TreeContainer>
            {Object.entries(data).map(([key, delta]) => renderDelta(key, delta))}
        </TreeContainer>
    );
};