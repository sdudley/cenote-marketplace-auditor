import React from 'react';
import {
    buildVersionFieldChanges,
    truncateChangeValue,
    VALUE_NONE,
    VALUE_REMOVED,
    VALUE_UNKNOWN
} from '#common/util/versionChangeUtils.js';
import {
    TreeValueNew,
    TreeValueOld,
    VersionChangeLine,
    VersionChangePath,
    VersionDiffCell
} from './styles';

interface VersionChangesCellProps {
    /** Version number of this row; version 1 is labelled as the initial version. */
    version: number;
    /** Stored diff string (changed paths joined with " | "). */
    diff?: string | null;
    /** Data of the previous version, or undefined if it isn't in the list. */
    priorData: unknown;
    /** Data of this version. */
    currentData: unknown;
}

/** Value text, truncated, with the full value available on hover when shortened. */
const TruncatedValue: React.FC<{ value: string }> = ({ value }) => {
    const truncated = truncateChangeValue(value);
    return <span title={truncated === value ? undefined : value}>{truncated}</span>;
};

/**
 * Renders a change in the same style as the full version diff (JsonDiffObjectTreeView): the old value in red
 * strikethrough followed by the new value in green. Added fields show only the new value and removed fields
 * only the old value; when the prior version is unknown, only the new value is shown.
 */
const ChangeValues: React.FC<{ oldValue: string; newValue: string }> = ({ oldValue, newValue }) => {
    const hasOld = oldValue !== VALUE_NONE && oldValue !== VALUE_UNKNOWN;
    const hasNew = newValue !== VALUE_REMOVED;
    return (
        <>
            {hasOld && (
                <TreeValueOld component="span" variant="inherit">
                    <TruncatedValue value={oldValue} />
                </TreeValueOld>
            )}
            {hasNew && (
                <TreeValueNew component="span" variant="inherit">
                    <TruncatedValue value={newValue} />
                </TreeValueNew>
            )}
        </>
    );
};

/** Table cell listing each changed field of a version on its own line as "path: old new". */
export const VersionChangesCell: React.FC<VersionChangesCellProps> = ({ version, diff, priorData, currentData }) => {
    const changes = buildVersionFieldChanges(diff, priorData, currentData);

    if (changes.length === 0) {
        return <VersionDiffCell>{version === 1 ? 'Initial version' : 'No changes'}</VersionDiffCell>;
    }

    return (
        <VersionDiffCell>
            {changes.map(change => (
                <VersionChangeLine key={change.path}>
                    <VersionChangePath>{change.path}</VersionChangePath>
                    {': '}
                    <ChangeValues oldValue={change.oldValue} newValue={change.newValue} />
                </VersionChangeLine>
            ))}
        </VersionDiffCell>
    );
};
