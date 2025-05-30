select 
tv.created_at,
tv.transaction_id,
t.data->'purchaseDetails'->>'saleDate' as sale_date,
tv.data->'paymentStatus' as payment_status,
tv.data->'purchaseDetails'->>'saleType' as sale_type,
tv.data->'transactionId' as tranx_id,
tv.data->'purchaseDetails'->'maintenanceStartDate' as start,
tv.data->'purchaseDetails'->'maintenanceEndDate' as enddate, 
tv.diff 
from transaction_version tv
left join transaction t on t.id=tv.transaction_id
where tv.entitlement_id ='E-xxxxxxxx'
order by sale_date desc, tv.transaction_id, created_at desc;
