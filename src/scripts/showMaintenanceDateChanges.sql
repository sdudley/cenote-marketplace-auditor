select
    lnow.data->>'lastUpdated' as lastupdated,
    lnow.data->>'hosting' as hosting,
    lnow.data->'contactDetails'->>'company' as company,
    case when lnow.data->>'appEntitlementNumber' is not null then lnow.data->>'appEntitlementNumber' else lnow.data->>'licenseId' end as sen,
    lnow.data->>'tier' as tier,
    lprior.data->>'maintenanceEndDate' as end_maint_prior,
    lnow.data->>'maintenanceEndDate' as end_maint_now,
    EXTRACT(DAY FROM ((lnow.data->>'maintenanceEndDate')::timestamp - (lprior.data->>'maintenanceEndDate')::timestamp)) AS maint_days_diff,
    lnow.data
FROM license_version lnow
LEFT JOIN license_version lprior on lnow.prior_license_version_id=lprior.id
WHERE lnow.diff like '%maintenanceEndDate%'
ORDER BY lastupdated desc;
