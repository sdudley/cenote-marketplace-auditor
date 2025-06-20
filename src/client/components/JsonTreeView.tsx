import React from 'react';
import { Box, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { KeyColumn, ValueColumn, LabelContainer, JsonValue, JsonKey, TreeBorder } from './styles';
import { humanizeKey } from './util';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];

interface JsonTreeViewProps {
    data: JsonValue;
    nodeId?: string;
    humanizeKeys?: boolean;
}

const formatValue = (val: JsonValue): string => {
    if (typeof val !== 'number') return typeof val === 'string' ? val : JSON.stringify(val);
    return val.toString();
};

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, nodeId = '', humanizeKeys = true }) => {
    if (data === null) return <Typography color="text.secondary">null</Typography>;
    if (typeof data !== 'object') return <Typography>{JSON.stringify(data)}</Typography>;

    return Object.entries(data as JsonObject)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => {
            const currentId = nodeId ? `${nodeId}.${key}` : key;
            const displayKey = humanizeKeys ? humanizeKey(key) : key;

            const label = (
                <LabelContainer>
                    <KeyColumn>
                        <JsonKey component="span">
                            {displayKey}:
                        </JsonKey>
                    </KeyColumn>
                    <ValueColumn>
                        {typeof value !== 'object' && (
                            <JsonValue component="span">
                                {formatValue(value)}
                            </JsonValue>
                        )}
                    </ValueColumn>
                </LabelContainer>
            );

            const BorderObject = value && typeof value === 'object' ? TreeBorder : Box;

            return (
                <BorderObject key={currentId}>
                    <TreeItem itemId={currentId} label={label}>
                        {value && typeof value === 'object' && <JsonTreeView data={value} nodeId={currentId} humanizeKeys={humanizeKeys} />}
                    </TreeItem>
                </BorderObject>
            );
        });
};