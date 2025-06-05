import React from 'react';
import { Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { KeyColumn, ValueColumn, LabelContainer, JsonValue, JsonKey } from './styles';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];

interface JsonTreeViewProps {
    data: JsonValue;
    nodeId?: string;
}

const formatValue = (val: JsonValue): string => {
    if (typeof val !== 'number') return typeof val === 'string' ? val : JSON.stringify(val);
    return val.toString();
};

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, nodeId = '' }) => {
    if (data === null) return <Typography color="text.secondary">null</Typography>;
    if (typeof data !== 'object') return <Typography>{JSON.stringify(data)}</Typography>;

    return Object.entries(data as JsonObject)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => {
            const currentId = nodeId ? `${nodeId}.${key}` : key;

            const label = (
                <LabelContainer>
                    <KeyColumn>
                        <JsonKey component="span">
                            {key}:
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

            if (value && typeof value === 'object') {
                return (
                    <TreeItem key={currentId} itemId={currentId} label={label}>
                        <JsonTreeView data={value} nodeId={currentId} />
                    </TreeItem>
                );
            }

            return <TreeItem key={currentId} itemId={currentId} label={label} />;
        });
};