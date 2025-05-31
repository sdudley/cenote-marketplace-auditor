select data->'purchaseDetails'->>'saleDate' saledate,
data->'purchaseDetails'->>'saleType' saletype,
data->'purchaseDetails'->>'tier' tier,
data->'purchaseDetails'->>'maintenanceStartDate' m_start,
data->'purchaseDetails'->>'maintenanceEndDate' mend,
data->'purchaseDetails'->>'vendorAmount' v_amt,
ta.purchase_price_discount price_adjustment
from transaction t
left join transaction_adjustment ta on ta.transaction_id = t.id
where entitlement_id ='E-xxxx'
order by 1 asc;