// List of various permutations of legacy pricing (or not) for both the main transaction and the
// license we are upgrading from (if any).

import { LegacyPricePermutation } from "./types";

export const LEGACY_PRICING_PERMUTATIONS_WITH_UPGRADE : LegacyPricePermutation[] = [
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // start with no legacy pricing
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: false },   // try different permutations of legacy pricing
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: true },
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: true },
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // Must end with no legacy pricing (again) if we find no match
];

export const LEGACY_PRICING_PERMUTATIONS_NO_UPGRADE : LegacyPricePermutation[] = [
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // start with no legacy pricing
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: false },
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // Must end with no legacy pricing (again) if we find no match
];

export const EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ACTUAL_ADJUSTMENTS : boolean[] = [
    true,
    false,
    true // Must end with true (again) if we find no match to produce expected price with discounts
];

export const EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ESTIMATED_ADJUSTMENTS : boolean[] = [
    true,
    false // Ends with no discounts applied on failure, so that our summary does not show the impact of potentially-incorrect estimated discounts
];

// Are these right?!
export const PARTNER_DISCOUNT_PERMUTATIONS_FOR_CLOUD : number[] = [
    0.20,
    0.10,
    0.05,
    0.00
];

// Are these right?!
export const PARTNER_DISCOUNT_PERMUTATIONS_FOR_DATACENTER : number[] = [
    0.25,
    0.20,
    0.10,
    0.00
];

export const PARTNER_DISCOUNT_PERMUTATIONS_FOR_OPT_OUT : number[] = [
    0.00
];
