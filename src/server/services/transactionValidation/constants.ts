export const MAX_JPY_DRIFT = 0.15; // Atlassian generally allows a 15% buffer for Japanese Yen transactions

// Do not reconcile automatically if legacy price used this late:
// Allow for at least 60-day grandfathering, 90-day quote, 30-day purchase
export const ALERT_DAYS_AFTER_PRICING_CHANGE = 180;