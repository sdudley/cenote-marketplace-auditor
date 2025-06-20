import React from 'react';
import { JsonDiffObject, JsonDelta } from '#common/util/objectDiff';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
    TreeContainer,
    TreeValueOld,
    TreeValueNew,
    LabelContainer,
    KeyColumn,
    JsonKey,
    JsonKeyNew,
    JsonValue,
    ValueColumn,
    TreeBorder
} from './styles';
import { Box } from '@mui/material';
import { humanizeKey } from './util';

interface JsonDiffObjectTreeViewProps {
    data: JsonDiffObject;
    humanizeKeys?: boolean;
    highlightNew?: boolean;
}

export const JsonDiffObjectTreeView: React.FC<JsonDiffObjectTreeViewProps> = ({
    data,
    humanizeKeys = true,
    highlightNew = true
}) => {
    const renderValue = (value: any): string => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `${value}`;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const renderDelta = (key: string, delta: JsonDelta, parentKey: string = '', isParentNew: boolean = false) => {
        const hasChildren = delta.children && Object.keys(delta.children).length > 0;
        const isNew = delta.changeType === 'added' || isParentNew;

        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const displayKey = humanizeKeys ? humanizeKey(key) : key;

        // Use JsonKeyNew if this object is newly added (either directly or through a parent) and highlighting is enabled
        const KeyComponent = (isNew && highlightNew) ? JsonKeyNew : JsonKey;

        const label = (
            <LabelContainer>
                <KeyColumn>
                    <KeyComponent component="span">
                        {displayKey}:
                    </KeyComponent>
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
                                : delta.changeType==='added' ? (
                                    highlightNew ?
                                        <TreeValueNew component="span">{renderValue(delta.newValue)}</TreeValueNew>
                                        : <span>{renderValue(delta.newValue)}</span>
                                )
                                : delta.changeType==='removed' ? <TreeValueOld component="span">{renderValue(delta.oldValue)}</TreeValueOld>
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
                            renderDelta(childKey, childDelta, fullKey, isNew)
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