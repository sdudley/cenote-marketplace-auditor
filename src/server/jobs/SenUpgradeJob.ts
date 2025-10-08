import { LicenseDao } from "#server/database/dao/LicenseDao";
import { LicenseVersionDao } from "#server/database/dao/LicenseVersionDao";
import { TransactionDao } from "#server/database/dao/TransactionDao";
import { TransactionVersionDao } from "#server/database/dao/TransactionVersionDao";
import { TransactionReconcileDao } from "#server/database/dao/TransactionReconcileDao";
import { injectable, inject } from "inversify";
import { TYPES } from "#server/config/types";

@injectable()
export class SenUpgradeJob {
    constructor(@inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
                @inject(TYPES.LicenseVersionDao) private licenseVersionDao: LicenseVersionDao,
                @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
                @inject(TYPES.TransactionVersionDao) private transactionVersionDao: TransactionVersionDao,
                @inject(TYPES.TransactionReconcileDao) private transactionReconcileDao: TransactionReconcileDao) {}

    public async upgradeSens(): Promise<void> {
        console.log('Upgrading SENs');
        await this.upgradeTransactionSENs();
        await this.upgradeLicenseSENs();
        console.log('Finished upgrading SENs');
    }

    public async upgradeTransactionSENs() {
        console.log('Fetching obsolete transactions:');
        const obsoleteTransactions = await this.transactionDao.getTransactionsWithObsoleteEntitlementNumbers();

        console.log('Got obsolete transaction list:');
        console.dir(obsoleteTransactions, { depth: null});

        console.log('Deleting automatic reconciles for duplicate transactions:');
        await this.transactionReconcileDao.deleteReconcileForTransactions(obsoleteTransactions.map(tx => tx.id));

        console.log('Updating transaction versions for obsolete SENs');
        await this.transactionVersionDao.updateTransactionVersionsWithObsoleteEntitlementNumbers(obsoleteTransactions);

        console.log('Updating transactions for obsolete SENs');
        await this.transactionDao.updateTransactionsWithObsoleteEntitlementNumbers(obsoleteTransactions);

        console.log('Finished upgrading transaction SENs');
    }

    public async upgradeLicenseSENs(): Promise<void> {
        const duplicateLicenses = await this.licenseDao.findDuplicateLicenses();

        console.log('Got duplicate licenses:');
        console.dir(duplicateLicenses, { depth: null });

        const duplicateIds = duplicateLicenses.map(dl => dl.duplicateLicenseId);

        console.log('Deleting duplicate license versions of license pair:');
        await this.licenseVersionDao.deleteLicenseVersionsForLicenseIds(duplicateIds);

        console.log('Deleting duplicate licenses of license pair:');
        await this.licenseDao.deleteDuplicateLicenses(duplicateIds);

        console.log('Remapping existing licenses for new PKs:');
        await this.licenseDao.updatePkForDuplicateLicenses(duplicateLicenses);

        console.log('Finished upgrading license SENs');
    }
}
