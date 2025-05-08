import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '../config/database';
import { Pricing } from '../entities/Pricing';
import { PricingInfo } from '../entities/PricingInfo';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { LessThan, MoreThan, IsNull, Between, Or } from 'typeorm';
import { createLocalDateFromString, stripTimeFromDate } from '../utils/dateUtils';

interface DateRange {
    startDate?: Date;
    endDate?: Date;
}

function getOverlapQueryConditions(addonKey: string, deploymentType: string, dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    if (startDate && endDate) {
        return {
            addonKey,
            deploymentType,
            startDate: Or(
                LessThan(endDate),
                IsNull()
            ),
            endDate: Or(
                MoreThan(startDate),
                IsNull()
            )
        };
    } else if (startDate) {
        return {
            addonKey,
            deploymentType,
            startDate: Or(
                LessThan(new Date('9999-12-31')),
                IsNull()
            ),
            endDate: Or(
                MoreThan(startDate),
                IsNull()
            )
        };
    } else if (endDate) {
        return {
            addonKey,
            deploymentType,
            startDate: Or(
                LessThan(endDate),
                IsNull()
            ),
            endDate: IsNull()
        };
    } else {
        return {
            addonKey,
            deploymentType,
            startDate: IsNull(),
            endDate: IsNull()
        };
    }
}

function adjustOverlappingRecord(existingRecord: Pricing, newDateRange: DateRange): Pricing {
    const { startDate: newStartDate, endDate: newEndDate } = newDateRange;
    const adjustedRecord = { ...existingRecord };

    if (newStartDate && (!existingRecord.startDate || existingRecord.startDate < newStartDate)) {
        // If the existing record starts before our new record
        if (newEndDate) {
            // Set the end date of the existing record to the day before our new record starts
            const dayBefore = new Date(newStartDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            adjustedRecord.endDate = stripTimeFromDate(dayBefore);
        }
    } else if (newEndDate && (!existingRecord.endDate || existingRecord.endDate > newEndDate)) {
        // If the existing record ends after our new record
        if (newStartDate) {
            // Set the start date of the existing record to the day after our new record ends
            const dayAfter = new Date(newEndDate);
            dayAfter.setDate(dayAfter.getDate() + 1);
            adjustedRecord.startDate = stripTimeFromDate(dayAfter);
        }
    }

    return adjustedRecord;
}

async function handleOverlappingRecords(addonKey: string, deploymentType: string, dateRange: DateRange): Promise<number> {
    const overlappingRecords = await AppDataSource.getRepository(Pricing).find({
        where: getOverlapQueryConditions(addonKey, deploymentType, dateRange)
    });

    let adjustedCount = 0;
    for (const record of overlappingRecords) {
        const adjustedRecord = adjustOverlappingRecord(record, dateRange);
        if (adjustedRecord.startDate !== record.startDate || adjustedRecord.endDate !== record.endDate) {
            await AppDataSource.getRepository(Pricing).save(adjustedRecord);
            adjustedCount++;
        }
    }

    return adjustedCount;
}

async function main() {
    const addonKey = process.argv[2];
    const deploymentType = process.argv[3];
    const startDate = process.argv[4];
    const endDate = process.argv[5];
    const csvFile = process.argv[6];

    if (!addonKey || !deploymentType || !startDate || !csvFile) {
        console.error('Please provide addonKey, deploymentType, startDate, and csvFile as command line arguments. endDate is optional.');
        process.exit(1);
    }

    try {
        await initializeDatabase();
        console.log('Database connection established');

        // Read and parse CSV file
        const csvContent = fs.readFileSync(csvFile, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        }) as Array<{ userTier: string; cost: string }>;

        // Parse dates and strip time components
        const newStartDate = startDate === 'NONE' ? undefined : createLocalDateFromString(startDate);
        const newEndDate = endDate === 'NONE' ? undefined : createLocalDateFromString(endDate);
        const dateRange = { startDate: newStartDate, endDate: newEndDate };

        // Handle overlapping records
        const adjustedCount = await handleOverlappingRecords(addonKey, deploymentType, dateRange);

        // Create new pricing record
        const pricing = new Pricing();
        pricing.addonKey = addonKey;
        pricing.deploymentType = deploymentType;
        pricing.startDate = newStartDate;
        pricing.endDate = newEndDate;

        // Save pricing record first to get the ID
        await AppDataSource.getRepository(Pricing).save(pricing);

        // Create and save pricing info records
        const pricingInfoRecords = records.map(record => {
            const pricingInfo = new PricingInfo();
            pricingInfo.userTier = parseInt(record.userTier);
            pricingInfo.cost = parseFloat(record.cost);
            pricingInfo.pricing = pricing;
            return pricingInfo;
        });

        await AppDataSource.getRepository(PricingInfo).save(pricingInfoRecords);
        console.log(`Successfully imported ${pricingInfoRecords.length} pricing tiers for ${addonKey} ${deploymentType}`);
        if (adjustedCount > 0) {
            console.log(`Adjusted ${adjustedCount} overlapping pricing records`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();