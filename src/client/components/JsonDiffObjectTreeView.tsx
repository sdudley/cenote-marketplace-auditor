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
    JsonKeyRemoved,
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

const renderValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `${value}`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const createRenderFunctions = (
    humanizeKeys: boolean,
    highlightNew: boolean
) => {
    const renderArrayElements = (arrayElements: JsonDelta[], fullKey: string, isNew: boolean) => {
        return arrayElements.map((arrayDelta, index) => {
            const arrayKey = index.toString();
            const arrayFullKey = `${fullKey}.${arrayKey}`;
            const isArrayElementNew = arrayDelta.changeType === 'added' || isNew;

            // For array elements, we need to handle them differently
            // If it's a primitive value, render it directly
            if (arrayDelta.changeType !== 'added' && arrayDelta.changeType !== 'removed' &&
                !arrayDelta.children && arrayDelta.oldValue !== undefined && arrayDelta.newValue !== undefined) {
                return (
                    <Box key={arrayFullKey}>
                        <TreeItem
                            label={
                                <LabelContainer>
                                    <KeyColumn>
                                        <JsonKey component="span">
                                            {arrayKey}:
                                        </JsonKey>
                                    </KeyColumn>
                                    <ValueColumn>
                                        <JsonValue>
                                            {arrayDelta.changeType === 'changed' ? (
                                                <>
                                                    <TreeValueOld component="span">{renderValue(arrayDelta.oldValue)}</TreeValueOld>
                                                    <TreeValueNew component="span">{renderValue(arrayDelta.newValue)}</TreeValueNew>
                                                </>
                                            ) : (
                                                renderValue(arrayDelta.newValue)
                                            )}
                                        </JsonValue>
                                    </ValueColumn>
                                </LabelContainer>
                            }
                            itemId={arrayFullKey}
                        />
                    </Box>
                );
            }

            // For objects or added/removed elements, render with children
            return renderDelta(arrayKey, arrayDelta, fullKey, isArrayElementNew);
        });
    };

    const renderDelta = (key: string, delta: JsonDelta, parentKey: string = '', isParentNew: boolean = false) => {
        const hasChildren = delta.children && Object.keys(delta.children).length > 0;
        const hasArrayElements = delta.arrayElements && delta.arrayElements.length > 0;
        const isNew = delta.changeType === 'added' || isParentNew;

        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const displayKey = humanizeKeys ? humanizeKey(key) : key;

        // Use appropriate key component based on the change type and highlighting settings
        let KeyComponent = JsonKey;
        if (delta.changeType === 'removed') {
            KeyComponent = JsonKeyRemoved;
        } else if (isNew && highlightNew) {
            KeyComponent = JsonKeyNew;
        }

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
                            {!hasChildren && !hasArrayElements && (
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

        const BorderObject = (hasChildren || hasArrayElements) ? TreeBorder : Box;

        return (
            <BorderObject key={fullKey}>
                <TreeItem label={label} itemId={fullKey}>
                    {hasChildren && (
                        Object.entries(delta.children!).map(([childKey, childDelta]) =>
                            renderDelta(childKey, childDelta, fullKey, isNew)
                        )
                    )}
                    {hasArrayElements && (
                        renderArrayElements(delta.arrayElements!, fullKey, isNew)
                    )}
                </TreeItem>
            </BorderObject>
        );
    };

    return { renderDelta };
};

export const JsonDiffObjectTreeView: React.FC<JsonDiffObjectTreeViewProps> = ({
    data,
    humanizeKeys = true,
    highlightNew = true
}) => {
    const { renderDelta } = createRenderFunctions(humanizeKeys, highlightNew);

    return (
        <TreeContainer>
            {Object.entries(data).map(([key, delta]) => renderDelta(key, delta))}
        </TreeContainer>
    );
};