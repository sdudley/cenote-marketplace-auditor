--------------------------------------------------------------------------
-- Query license versions to be deleted
--------------------------------------------------------------------------

WITH eligible_license_ids AS (
    SELECT license_id
    FROM license_version
    GROUP BY license_id
    HAVING COUNT(*) >= 500
),
ordered AS (
    SELECT
        lv.id,
        lv.license_id,
        lv.version,
        lv.created_at,
        LAG(lv.created_at)  OVER (PARTITION BY lv.license_id ORDER BY lv.created_at, lv.id) AS prev_created_at,
        LEAD(lv.created_at) OVER (PARTITION BY lv.license_id ORDER BY lv.created_at, lv.id) AS next_created_at
    FROM license_version lv
    JOIN eligible_license_ids e ON e.license_id = lv.license_id
)
SELECT id, license_id, version, created_at
FROM ordered
WHERE
    prev_created_at >= '2026-01-01' AND
    (
        (prev_created_at IS NOT NULL AND created_at - prev_created_at <= INTERVAL '1 minute')
    OR
        (next_created_at IS NOT NULL AND next_created_at - created_at <= INTERVAL '1 minute')
    )
ORDER BY license_id, created_at, id;

--------------------------------------------------------------------------
-- Perform actual deletion of license versions
--------------------------------------------------------------------------

BEGIN;

WITH eligible_license_ids AS (
    SELECT license_id
    FROM license_version
    GROUP BY license_id
    HAVING COUNT(*) >= 500
),
ordered AS (
    SELECT
        lv.id,
        lv.license_id,
        lv.created_at,
        LAG(lv.created_at)  OVER (PARTITION BY lv.license_id ORDER BY lv.created_at, lv.id) AS prev_created_at,
        LEAD(lv.created_at) OVER (PARTITION BY lv.license_id ORDER BY lv.created_at, lv.id) AS next_created_at
    FROM license_version lv
    JOIN eligible_license_ids e ON e.license_id = lv.license_id
),
rows_to_delete AS (
    SELECT id
    FROM ordered
    WHERE
    prev_created_at >= '2026-01-01' AND
    (
        (prev_created_at IS NOT NULL AND created_at - prev_created_at <= INTERVAL '1 minute')
    OR
        (next_created_at IS NOT NULL AND next_created_at - created_at <= INTERVAL '1 minute')
    )

)
DELETE FROM license_version lv
USING rows_to_delete d
WHERE lv.id = d.id;

COMMIT;