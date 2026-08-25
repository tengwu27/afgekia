-- Administrators intentionally cannot read operational work records. Evaluate
-- suspension blockers with the function owner's privileges while exposing only
-- the pass/fail decision through this profile-update trigger.
alter function private.enforce_owner_suspension_blockers() security definer;
