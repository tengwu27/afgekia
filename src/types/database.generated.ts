// Generated database contract. Refresh with `npm run db:types` after migrations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "owner" | "admin" | "client";
export type AccountState = "active" | "suspended";
export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";
export type MilestoneStatus =
  | "not_started"
  | "active"
  | "blocked"
  | "done";
export type UpdateAudience = "staff" | "client";
export type BookingStatus =
  | "submitted"
  | "confirmed"
  | "reschedule_proposed"
  | "declined"
  | "cancelled"
  | "completed";
export type PublishState = "draft" | "published" | "archived";
export type PortfolioAccent = "olive" | "terracotta" | "gold" | "plum";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  state: AccountState;
  must_change_password: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface SiteSettingsRow {
  singleton: boolean;
  business_name: string;
  tagline: string;
  description: string;
  contact_email: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  instagram_url: string | null;
  linkedin_url: string | null;
  booking_lead_hours: number;
  booking_horizon_days: number;
  created_at: string;
  updated_at: string;
}

export interface BookingServiceRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookingRequestRow {
  id: string;
  reference_code: string;
  service_id: string;
  client_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  timezone: string;
  preferred_at: string;
  alternate_at: string | null;
  message: string;
  privacy_consent_at: string;
  status: BookingStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRequestAdminRow {
  booking_id: string;
  notes: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  reference_code: string;
  title: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  start_date: string | null;
  target_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberRow {
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface MilestoneRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  due_date: string | null;
  completed_at: string | null;
  client_visible: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectUpdateRow {
  id: string;
  project_id: string;
  title: string;
  body_json: Json;
  body_text: string;
  audience: UpdateAudience;
  status_snapshot: ProjectStatus | null;
  progress_snapshot: number | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemRow {
  id: string;
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  body_json: Json;
  body_text: string;
  cover_path: string | null;
  accent: PortfolioAccent;
  status: PublishState;
  featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemSourceRow {
  portfolio_item_id: string;
  source_project_id: string;
  created_by: string;
  created_at: string;
}

export interface PortfolioUpdateRow {
  id: string;
  portfolio_item_id: string;
  title: string;
  body_json: Json;
  body_text: string;
  progress: number | null;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioUpdateSourceRow {
  portfolio_update_id: string;
  source_project_update_id: string;
  created_by: string;
  created_at: string;
}

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_json: Json;
  body_text: string;
  cover_path: string | null;
  status: PublishState;
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetRow {
  id: string;
  bucket: "public-media";
  path: string;
  alt_text: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp" | "image/avif";
  bytes: number;
  width: number | null;
  height: number | null;
  created_by: string;
  created_at: string;
}

export interface AuditEventRow {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Json;
  created_at: string;
}

type TableDefinition<Row extends object> = {
  Row: Row & Record<string, unknown>;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow>;
      site_settings: TableDefinition<SiteSettingsRow>;
      booking_services: TableDefinition<BookingServiceRow>;
      booking_requests: TableDefinition<BookingRequestRow>;
      booking_request_admin: TableDefinition<BookingRequestAdminRow>;
      projects: TableDefinition<ProjectRow>;
      project_members: TableDefinition<ProjectMemberRow>;
      milestones: TableDefinition<MilestoneRow>;
      project_updates: TableDefinition<ProjectUpdateRow>;
      portfolio_items: TableDefinition<PortfolioItemRow>;
      portfolio_item_sources: TableDefinition<PortfolioItemSourceRow>;
      portfolio_updates: TableDefinition<PortfolioUpdateRow>;
      portfolio_update_sources: TableDefinition<PortfolioUpdateSourceRow>;
      articles: TableDefinition<ArticleRow>;
      media_assets: TableDefinition<MediaAssetRow>;
      audit_events: TableDefinition<AuditEventRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      account_state: AccountState;
      project_status: ProjectStatus;
      milestone_status: MilestoneStatus;
      update_audience: UpdateAudience;
      booking_status: BookingStatus;
      publish_state: PublishState;
      portfolio_accent: PortfolioAccent;
    };
    CompositeTypes: Record<string, never>;
  };
}
