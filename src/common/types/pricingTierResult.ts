import { UserTierPricing } from './userTiers';

export interface PricingTierResult {
    tiers: UserTierPricing[];                   // Pricing tiers corresponding to the saleDate of the transaction
    priorTiers: UserTierPricing[]|undefined;    // Pricing tiers corresponding to the period prior to the saleDate of the transaction
    priorPricingEndDate: string|undefined;      // Date on which the priorTiers pricing was supposed to end
}