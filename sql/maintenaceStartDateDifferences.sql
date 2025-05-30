select data->>'maintenanceStartDate' as msd, data->>'latestMaintenanceStartDate' as lmsd, jsonb_pretty(data)
from license
where data->>'maintenanceStartDate' != data->>'latestMaintenanceStartDate'
and data->>'licenseType' NOT IN ('OPEN_SOURCE')
order by data->>'latestMaintenanceStartDate' desc;