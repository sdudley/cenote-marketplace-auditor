// Sort tiers by the user count, treating -1 as infinite.

import { UserTierPricing } from '../types/userTiers';

const userTierSorter = (a: UserTierPricing, b: UserTierPricing) => {
    if (a.userTier===-1) {
        return 1;
    }

    if (b.userTier===-1) {
        return -1;
    }

    return a.userTier - b.userTier;
};

export { userTierSorter };
