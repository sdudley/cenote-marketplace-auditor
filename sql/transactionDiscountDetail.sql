-- Show transaction data with values extracted from the discounts array

SELECT
  t.entitlement_id,
  tr.reconciled,
  tr.expected_vendor_amount - tr.actual_vendor_amount AS actual_vs_expected_diff,
  t.data->'purchaseDetails'->>'saleDate' AS saledate,
  t.data->>'transactionId' AS transaction_id,
--  t.data->'purchaseDetails'->'partnerDiscountAmount' AS deprecated_partner_discount_amount,
  coalesce(d.total_discount, 0) AS total_discount,
  coalesce(d.expert_discount, 0) AS expert_discount,
  coalesce(d.manual_discount, 0) AS manual_discount,
  coalesce(d.promo_code_discount, 0) AS promo_code_discount,
  coalesce(d.loyalty_discount, 0) AS loyalty_discount,
  coalesce(d.unknown_discount, 0) AS unknown_discount
FROM transaction t
LEFT JOIN LATERAL (
  SELECT
    sum(CASE WHEN elem->>'type' = 'EXPERT' THEN (elem->>'amount')::numeric(14,2) ELSE 0 END) AS expert_discount,
    sum(CASE WHEN elem->>'type' = 'MANUAL' THEN (elem->>'amount')::numeric(14,2) ELSE 0 END) AS manual_discount,
    sum(CASE WHEN elem->>'type' = 'MARKETPLACE_PROMOTION' THEN (elem->>'amount')::numeric(14,2) ELSE 0 END) AS promo_code_discount,
    sum(CASE WHEN elem->>'type' = 'LOYALTY_DISCOUNT' THEN (elem->>'amount')::numeric(14,2) ELSE 0 END) AS loyalty_discount,
    sum(CASE WHEN elem->>'type' NOT IN (
        'LOYALTY_DISCOUNT', 'EXPERT', 'MANUAL', 'MARKETPLACE_PROMOTION'
    ) THEN (elem->>'amount')::numeric(14,2) ELSE 0 END) AS unknown_discount,
    sum((elem->>'amount')::numeric(14,2)) AS total_discount
  FROM jsonb_array_elements(t.data->'purchaseDetails'->'discounts') AS elem
) AS d ON TRUE
LEFT JOIN transaction_reconcile tr on tr.transaction_id = t.id
WHERE total_discount > 0
ORDER BY saledate DESC;