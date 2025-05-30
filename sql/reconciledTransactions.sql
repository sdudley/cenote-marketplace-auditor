SELECT t.entitlement_id,
t.data->'purchaseDetails'->>'saleDate' as saleDate,
tr.reconciled as Rec,
tr.expected_vendor_amount as Expected,
tr.actual_vendor_amount as Actual,
tr.transaction_version as TxVersion,
t.data->'purchaseDetails'->>'maintenanceStartDate' as start_date,
t.data->'purchaseDetails'->>'maintenanceEndDate' as end_date,
t.data->'partnerDetails'->>'partnerName' as reseller,
tr.notes
FROM transaction t
LEFT JOIN transaction_reconcile tr on t.id=tr.transaction_id AND tr.current=true
WHERE tr.reconciled=false or tr.reconciled is null
ORDER BY t.data->'purchaseDetails'->>'saleDate' DESC, t.created_at DESC;