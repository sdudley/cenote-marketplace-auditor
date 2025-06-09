import { Transaction } from "#common/entities/Transaction";
import { TYPES } from "#server/config/types";
import { inject, injectable } from "inversify";
import { LicenseDao } from "#server/database/LicenseDao";

@injectable()
export class TransactionSandboxService {
    constructor(
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
    ) {}

    public async isTransactionForSandbox(transaction: Transaction) : Promise<boolean> {
        const { vendorAmount } = transaction.data.purchaseDetails;

        if (vendorAmount !== 0) {
            return false;
        }

        const license = await this.licenseDao.loadLicenseForTransaction(transaction);

        if (!license) {
            return false;
        }

        return license.data.installedOnSandbox ? true : false;
    }
}