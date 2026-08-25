import type { JSONContent } from "@tiptap/core";

import type { Database } from "@/types/database.generated";

type PublicTables = Database["public"]["Tables"];
type Row<Name extends keyof PublicTables> = PublicTables[Name]["Row"];
type PublicEnums = Database["public"]["Enums"];

export type Role = PublicEnums["app_role"];
export type AccountState = PublicEnums["account_state"];
export type ProjectStatus = PublicEnums["project_status"];
export type MilestoneStatus = PublicEnums["milestone_status"];
export type UpdateAudience = PublicEnums["update_audience"];
export type BookingStatus = PublicEnums["booking_status"];
export type ProjectType = PublicEnums["project_type"];
export type ProjectRequestStatus = PublicEnums["project_request_status"];
export type ListingStageCode = PublicEnums["listing_stage_code"];
export type ListingStageStatus = PublicEnums["listing_stage_status"];
export type AssessmentRevisionStatus = PublicEnums["assessment_revision_status"];
export type AssessmentApprovalStatus = PublicEnums["assessment_approval_status"];
export type RichTextDocument = JSONContent;

export type SiteSettings = Row<"site_settings">;
export type BookingService = Row<"booking_services">;
export type BookingRequest = Row<"booking_requests"> & { service?: BookingService | null };
export type Profile = Row<"profiles">;
export type Project = Row<"projects">;
export type ProjectStage = Row<"project_stages">;
export type AssessmentPlanRevision = Row<"assessment_plan_revisions">;
export type AssessmentPlanApproval = Row<"assessment_plan_approvals">;
export type Milestone = Row<"milestones">;
export type ProjectUpdate = Row<"project_updates">;
export type ProjectRequest = Row<"project_requests">;
export type OwnerProjectType = Row<"owner_project_types">;

export interface ProjectDetail extends Project {
  milestones: Milestone[];
  project_updates: ProjectUpdate[];
  project_members: Array<{ user_id: string; profiles: Profile | null }>;
}

export interface AuthContext {
  userId: string;
  email: string;
  profile: Profile;
}

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface CredentialActionState extends ActionState {
  email?: string;
  temporaryPassword?: string;
}

export interface BookingActionState extends ActionState {
  referenceCode?: string;
}

export interface ProjectRequestActionState extends ActionState {
  referenceCode?: string;
}
