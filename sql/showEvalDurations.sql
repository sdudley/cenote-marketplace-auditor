select 
entitlement_id,
data->>'licenseType' as license_type,
data->>'evaluationStartDate' as eval_start, 
data->>'latestEvaluationStartDate' as latest_eval_start, 
data->>'evaluationEndDate' as eval_end, 
age((data->>'evaluationEndDate')::date, (data->>'evaluationStartDate')::date) as eval_duration,
data->>'maintenanceStartDate' as maint_start,
data->>'maintenanceEndDate' as maint_end,
data->'contactDetails'->>'company' as company,
jsonb_pretty(data)
from license
where
--  (data->>'evaluationEndDate' >= data->>'maintenanceEndDate')
data->>'latestEvaluationStartDate' >= data->>'maintenanceEndDate' 
and (data->>'installedOnSandbox' IS NULL or data->>'installedOnSandbox' != 'Yes')
order by eval_duration desc
limit 1000;