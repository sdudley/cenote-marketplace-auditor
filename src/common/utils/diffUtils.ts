import { diffJson } from 'diff';
import chalk from 'chalk';

export function printJsonDiff(oldObj: any, newObj: any): void {
    const differences = diffJson(oldObj, newObj);

    console.log('\nChanges detected:');
    console.log('----------------');

    differences.forEach(part => {
        const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.gray;
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        console.log(color(`${prefix} ${part.value}`));
    });

    console.log('----------------\n');
}