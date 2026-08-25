-- Project request approval performs a tightly scoped, multi-table operation.
-- Run it with the function owner's privileges after RLS has authorized the
-- request update; the function still verifies the authenticated actor before
-- creating any records.
alter function private.process_project_request_decision() security definer;
