import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '@common/config/database';
import { Pricing } from '@common/entities/Pricing';
import { PricingInfo } from '@common/entities/PricingInfo';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { LessThan, MoreThan, IsNull, Or, Repository } from 'typeorm';
import { isoDateMath } from '@common/utils/dateUtils';
import { formatCurrency } from '@common/utils/formatCurrency';

interface DateRange {
    startDate?: string;
    endDate?: string;
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

    // Special case: if existing record has both dates null, treat it as the most current record
    if (existingRecord.startDate === null && existingRecord.endDate === null) {
        if (newEndDate) {
            adjustedRecord.startDate = isoDateMath(newEndDate, 1);
            // Keep endDate as null to indicate it's still the most current record
        }
        return adjustedRecord;
    }

    if (newStartDate && (!existingRecord.startDate || existingRecord.startDate < newStartDate)) {
        // If the existing record starts before our new record
        if (newEndDate) {
            // Set the end date of the existing record to the day before our new record starts
            adjustedRecord.endDate = isoDateMath(newStartDate, -1);
        }
    } else if (newEndDate && (!existingRecord.endDate || existingRecord.endDate > newEndDate)) {
        // If the existing record ends after our new record
        if (newStartDate) {
            // Set the start date of the existing record to the day after our new record ends
            adjustedRecord.startDate = isoDateMath(newEndDate, 1);
        }
    }

    return adjustedRecord;
}

async function handleOverlappingRecords(pricingRepo: Repository<Pricing>, addonKey: string, deploymentType: string, dateRange: DateRange): Promise<number> {
    const overlappingRecords = await pricingRepo.find({
        where: getOverlapQueryConditions(addonKey, deploymentType, dateRange)
    });

    let adjustedCount = 0;
    for (const record of overlappingRecords) {
        const adjustedRecord = adjustOverlappingRecord(record, dateRange);
        if (adjustedRecord.startDate !== record.startDate || adjustedRecord.endDate !== record.endDate) {
            await pricingRepo.save(adjustedRecord);
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

    if (!addonKey || !deploymentType || !startDate || !endDate || !csvFile) {
        console.error('Usage: importPricing <addonKey> <deploymentType> <startDate> <endDate> <csvFile>');
        console.error('If startDate or endDate represent the end of time, use "NONE" instead.');
        process.exit(1);
    }

    try {
        await initializeDatabase();
        const pricingRepo = await AppDataSource.getRepository(Pricing);
        const pricingInfoRepo = await AppDataSource.getRepository(PricingInfo);
        console.log('Database connection established');

        // Read and parse CSV file
        const csvContent = fs.readFileSync(csvFile, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        }) as Array<{ userTier: string; cost: string; }>;

        // Parse dates and strip time components
        const newStartDate = startDate === 'NONE' ? undefined : startDate;
        const newEndDate = endDate === 'NONE' ? undefined : endDate;

        const dateRange = { startDate: newStartDate, endDate: newEndDate };

        // Handle overlapping records
        const adjustedCount = await handleOverlappingRecords(pricingRepo, addonKey, deploymentType, dateRange);

        // Create new pricing record
        const pricing = new Pricing();
        pricing.addonKey = addonKey;
        pricing.deploymentType = deploymentType;
        pricing.startDate = newStartDate;
        pricing.endDate = newEndDate;

        // Save pricing record first to get the ID
        await pricingRepo.save(pricing);

        // Create and save pricing info records
        const pricingInfoRecords : PricingInfo[] = records.map(r => {
            const pricingInfo = new PricingInfo();
            pricingInfo.userTier = parseInt(r.userTier);
            pricingInfo.cost = parseFloat(r.cost);
            pricingInfo.pricing = pricing;
            console.log(`Persisting pricing tier: ${pricingInfo.userTier} at ${formatCurrency(pricingInfo.cost)}`);
            return pricingInfo;
        });

        await pricingInfoRepo.save(pricingInfoRecords);

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