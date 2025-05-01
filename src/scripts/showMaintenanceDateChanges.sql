

WITH latest_transaction AS (
    SELECT DISTINCT ON (entitlement_id) *
    FROM transaction
    ORDER BY entitlement_id, data->'purchaseDetails'->>'saleDate' DESC, created_at DESC
)
select
    lnow.data->>'lastUpdated' as lastupdated,
    lnow.data->>'hosting' as hosting,
    lnow.data->>'installedOnSandbox' as sandbox,
    lnow.data->'contactDetails'->>'company' as company,
    t.data->'customerDetails'->>'company' as tranx_company,
    lnow.entitlement_id,
    lnow.data->>'tier' as tier,
    lprior.data->>'maintenanceEndDate' as end_maint_prior,
    lnow.data->>'maintenanceEndDate' as end_maint_now,
    EXTRACT(DAY FROM ((lnow.data->>'maintenanceEndDate')::timestamp - (lprior.data->>'maintenanceEndDate')::timestamp)) AS maint_days_diff,
    lnow.data
FROM license_version lnow
LEFT JOIN license_version lprior on lnow.prior_license_version_id=lprior.id
LEFT JOIN latest_transaction t on t.entitlement_id=lnow.entitlement_id
WHERE lnow.diff like '%maintenanceEndDate%'
ORDER BY lastupdated desc;
