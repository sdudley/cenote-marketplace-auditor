select
ta.created_at,
ta.purchase_price_discount discount,
substring(ta.notes, 1, 30) notes,
t.entitlement_id,
t.data->'customerDetails'->>'company' company,
t.data->'purchaseDetails'->>'saleDate' saledate,
t.data->'purchaseDetails'->>'saleType' saletype,
t.data->'purchaseDetails'->>'tier' tier,
t.data->'purchaseDetails'->>'maintenanceStartDate' m_start,
t.data->'purchaseDetails'->>'maintenanceEndDate' mend,
t.data->'purchaseDetails'->>'vendorAmount' v_amt
FROM transaction_adjustment ta
LEFT JOIN transaction t ON t.id = ta.transaction_id
--WHERE t.entitlement_id = 'E-xxxxx'
ORDER BY t.entitlement_id, ta.created_at DESC;