import { DeploymentType } from "../types/marketplace";
import { Transaction } from "../entities/Transaction";
import { Repository } from "typeorm";
import { License } from "../entities/License";

const userCountFromTier = (tier: string): number => {
    if (tier === 'Unlimited Users') {
        return -1;
    }

    // Handle both 'XXXX Users' and 'Per Unit Pricing (XXXX Users)' formats
    const match = tier.match(/(\d+)\s+Users/);
    if (match) {
        return parseInt(match[1], 10);
    }

    throw new Error(`Invalid tier format: ${tier}`);
}

const deploymentTypeFromHosting = (hosting: string): DeploymentType => {
    switch (hosting) {
        case 'Server': return 'server';
        case 'Data Center': return 'datacenter';
        case 'Cloud': return 'cloud';
        default:
            throw new Error(`Unknown hosting type: ${hosting}`);
    }
}

const loadLicenseForTransaction = async (licenseRepository: Repository<License>, transaction: Transaction): Promise<License | null> => {
    return await licenseRepository
        .findOne({
            where: { entitlementId: transaction.entitlementId }
        });
}

export { userCountFromTier, deploymentTypeFromHosting, loadLicenseForTransaction };