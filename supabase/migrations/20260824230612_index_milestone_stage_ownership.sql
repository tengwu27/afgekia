create index milestones_project_stage_ownership_idx
  on public.milestones (project_id, project_stage_id)
  where project_stage_id is not null;
