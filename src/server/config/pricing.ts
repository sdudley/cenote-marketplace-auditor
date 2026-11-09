/**
 * Deployment-level inputs to the Atlassian payout (discount) calculation.
 *
 * - IS_ROA: true when the audited apps are Runs-on-Atlassian (RoA) apps. These get the "less than $1M"
 *   full-amount rule from an earlier date than non-RoA apps.
 *
 * Accumulated revenue is not configured here; it is derived from the stored transactions
 * (see AccumulatedRevenueService).
 */

export interface PricingConfig {
    isRoA: boolean;
}

export function getPricingConfig(env: NodeJS.ProcessEnv = process.env): PricingConfig {
    return { isRoA: env.IS_ROA === 'true' };
}
