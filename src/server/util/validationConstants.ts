// Constants used for calcuating prices

export const CLOUD_DISCOUNT_RATIO_LEGACY = 0.85;
export const CLOUD_DISCOUNT_RATIO_LEGACY_END_DATE = '2026-04-01';

export const FORGE_RATE_2026_04_START_DATE = '2026-04-01';
export const FORGE_RATE_2026_04 = 0.84; // 16%
export const FORGE_RATE_2026_10_START_DATE = '2026-10-01';
export const FORGE_RATE_2026_10 = 0.83; // 17%

export const CONNECT_RATE_2026_04 = 0.80; // 20%
export const CONNECT_RATE_2026_10_START_DATE = '2026-10-01';
export const CONNECT_RATE_2026_10 = 0.75; // 25%

export const CLOUD_DISCOUNT_RATIO_LESS_THAN_1M = 1;
export const CLOUD_DISCOUNT_RATIO_LESS_THAN_1M_THRESHOLD = 1_000_000; // Accumulated revenue (USD) below which the full amount is kept
export const CLOUD_DISCOUNT_RATIO_LESS_THAN_1M_ROA_START_DATE = '2025-10-01'; // RoA sales on or after this date get full amount
export const CLOUD_DISCOUNT_RATIO_LESS_THAN_1M_NON_ROA_START_DATE = '2026-01-01'; // Non-RoA sales on or after this date get full amount
export const DC_DISCOUNT_RATIO = 0.75;
export const ACADEMIC_CLOUD_PRICE_RATIO = 0.25;

export const COMMUNITY_CLOUD_PRICE_RATIO = 0.25;
export const SOCIAL_IMPACT_GLOBAL_ACCESS_CLOUD_PRICE_RATIO = 0.15;

export const ACADEMIC_DC_PRICE_RATIO_LEGACY = 0.5;

export const ACADEMIC_DC_PRICE_RATIO_CURRENT_START_DATE = '2024-09-01'; // Not sure of exactly where the cutoff is?
export const ACADEMIC_DC_PRICE_RATIO_CURRENT_CONF_10K = 0.25;
export const ACADEMIC_DC_PRICE_RATIO_CURRENT_OTHER = 0.5;
