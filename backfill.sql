UPDATE committee_memberships cm
SET cm.committee_group_id = (
    SELECT cgp.committee_group_id
    FROM committee_group_position cgp
    WHERE cgp.committee_position_id = cm.committee_position_id
      AND cgp.level = cm.level
    LIMIT 1
)
WHERE (
    SELECT COUNT(*)
    FROM committee_group_position cgp
    WHERE cgp.committee_position_id = cm.committee_position_id
      AND cgp.level = cm.level
) = 1;
