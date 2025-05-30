WITH latest_transaction AS (
    SELECT DISTINCT ON (entitlement_id) *, data->'purchaseDetails'->>'maintenanceEndDate' tx_end
    FROM transaction
    ORDER BY entitlement_id, data->'purchaseDetails'->>'saleDate' DESC, created_at DESC
)
select l.entitlement_id,
l.data->>'tier' as tier,
l.data->>'licenseType' as license_type,
l.data->>'evaluationStartDate' as eval_start,
l.data->>'latestEvaluationStartDate' as ltst_eval_st,
l.data->>'maintenanceStartDate' as lic_start,
l.data->>'maintenanceEndDate' as lic_end,
t.tx_end,
l.data->>'parentProductEdition' as parent_prod_ed,
substring(l.data->'contactDetails'->>'company', 1, 20) as company,
l.data->'contactDetails'->'technicalContact'->>'email' as email
from license l
left join latest_transaction t using(entitlement_id)
WHERE
l.data->>'licenseType' NOT IN('EVALUATION', 'COMMUNITY', 'DEMONSTRATION', 'FREE', 'OPEN_SOURCE')
AND (l.data->>'maintenanceEndDate' > tx_end or tx_end is null)
ORDER BY l.data->>'maintenanceEndDate' desc;
