export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assessment_plan_approvals: {
        Row: {
          created_at: string
          note: string | null
          responded_at: string | null
          revision_id: string
          status: Database["public"]["Enums"]["assessment_approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          responded_at?: string | null
          revision_id: string
          status?: Database["public"]["Enums"]["assessment_approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          responded_at?: string | null
          revision_id?: string
          status?: Database["public"]["Enums"]["assessment_approval_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_plan_approvals_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "assessment_plan_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_plan_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_plan_revisions: {
        Row: {
          approvals_received: number
          approvals_required: number
          approved_at: string | null
          created_at: string
          id: string
          project_id: string
          revision_number: number
          snapshot: Json
          status: Database["public"]["Enums"]["assessment_revision_status"]
          submitted_at: string
          submitted_by: string
          superseded_at: string | null
          updated_at: string
        }
        Insert: {
          approvals_received?: number
          approvals_required: number
          approved_at?: string | null
          created_at?: string
          id?: string
          project_id: string
          revision_number: number
          snapshot: Json
          status?: Database["public"]["Enums"]["assessment_revision_status"]
          submitted_at?: string
          submitted_by: string
          superseded_at?: string | null
          updated_at?: string
        }
        Update: {
          approvals_received?: number
          approvals_required?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          project_id?: string
          revision_number?: number
          snapshot?: Json
          status?: Database["public"]["Enums"]["assessment_revision_status"]
          submitted_at?: string
          submitted_by?: string
          superseded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_plan_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_plan_revisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_request_admin: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string
          notes: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by: string
          notes?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string
          notes?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_request_admin_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_request_admin_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_request_admin_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          alternate_at: string | null
          client_user_id: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          owner_id: string
          phone: string | null
          preferred_at: string
          privacy_consent_at: string
          reference_code: string
          service_id: string
          status: Database["public"]["Enums"]["booking_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          alternate_at?: string | null
          client_user_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          owner_id: string
          phone?: string | null
          preferred_at: string
          privacy_consent_at: string
          reference_code: string
          service_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          timezone: string
          updated_at?: string
        }
        Update: {
          alternate_at?: string | null
          client_user_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          owner_id?: string
          phone?: string | null
          preferred_at?: string
          privacy_consent_at?: string
          reference_code?: string
          service_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_service_owner_fkey"
            columns: ["service_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      booking_services: {
        Row: {
          active: boolean
          created_at: string
          description: string
          display_order: number
          duration_minutes: number
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          display_order?: number
          duration_minutes: number
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          display_order?: number
          duration_minutes?: number
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string
          bucket: string
          bytes: number
          created_at: string
          created_by: string
          height: number | null
          id: string
          mime_type: string
          path: string
          width: number | null
        }
        Insert: {
          alt_text: string
          bucket?: string
          bytes: number
          created_at?: string
          created_by: string
          height?: number | null
          id?: string
          mime_type: string
          path: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          bucket?: string
          bytes?: number
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          mime_type?: string
          path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          client_visible: boolean
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          position: number
          project_id: string
          project_stage_id: string | null
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_visible?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          position?: number
          project_id: string
          project_stage_id?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
        }
        Update: {
          client_visible?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          position?: number
          project_id?: string
          project_stage_id?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_stage_project_fkey"
            columns: ["project_id", "project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["project_id", "id"]
          },
        ]
      }
      owner_project_types: {
        Row: {
          created_at: string
          display_name: string
          display_order: number
          listed: boolean
          owner_id: string
          project_type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number
          listed?: boolean
          owner_id: string
          project_type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number
          listed?: boolean
          owner_id?: string
          project_type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_project_types_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          privacy_consent_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          state: Database["public"]["Enums"]["account_state"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          must_change_password?: boolean
          privacy_consent_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          state?: Database["public"]["Enums"]["account_state"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          privacy_consent_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          state?: Database["public"]["Enums"]["account_state"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          is_assessment_approver: boolean
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_assessment_approver?: boolean
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_assessment_approver?: boolean
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          details: string
          id: string
          owner_id: string
          owner_response: string | null
          privacy_consent_at: string
          project_type: Database["public"]["Enums"]["project_type"]
          property_address_short: string
          reference_code: string
          requester_id: string
          resulting_project_id: string | null
          seller_nickname: string
          status: Database["public"]["Enums"]["project_request_status"]
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          details?: string
          id?: string
          owner_id: string
          owner_response?: string | null
          privacy_consent_at: string
          project_type?: Database["public"]["Enums"]["project_type"]
          property_address_short: string
          reference_code: string
          requester_id: string
          resulting_project_id?: string | null
          seller_nickname: string
          status?: Database["public"]["Enums"]["project_request_status"]
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          details?: string
          id?: string
          owner_id?: string
          owner_response?: string | null
          privacy_consent_at?: string
          project_type?: Database["public"]["Enums"]["project_type"]
          property_address_short?: string
          reference_code?: string
          requester_id?: string
          resulting_project_id?: string | null
          seller_nickname?: string
          status?: Database["public"]["Enums"]["project_request_status"]
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_resulting_project_id_fkey"
            columns: ["resulting_project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          actual_completed_at: string | null
          actual_started_at: string | null
          code: Database["public"]["Enums"]["listing_stage_code"]
          created_at: string
          id: string
          planned_end_date: string | null
          planned_start_date: string | null
          position: number
          project_id: string
          skip_reason: string | null
          status: Database["public"]["Enums"]["listing_stage_status"]
          updated_at: string
        }
        Insert: {
          actual_completed_at?: string | null
          actual_started_at?: string | null
          code: Database["public"]["Enums"]["listing_stage_code"]
          created_at?: string
          id?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          position: number
          project_id: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["listing_stage_status"]
          updated_at?: string
        }
        Update: {
          actual_completed_at?: string | null
          actual_started_at?: string | null
          code?: Database["public"]["Enums"]["listing_stage_code"]
          created_at?: string
          id?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          position?: number
          project_id?: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["listing_stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          audience: Database["public"]["Enums"]["update_audience"]
          body_json: Json
          body_text: string
          created_at: string
          created_by: string
          id: string
          occurred_at: string
          progress_snapshot: number | null
          project_id: string
          status_snapshot: Database["public"]["Enums"]["project_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["update_audience"]
          body_json: Json
          body_text: string
          created_at?: string
          created_by: string
          id?: string
          occurred_at?: string
          progress_snapshot?: number | null
          project_id: string
          status_snapshot?: Database["public"]["Enums"]["project_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["update_audience"]
          body_json?: Json
          body_text?: string
          created_at?: string
          created_by?: string
          id?: string
          occurred_at?: string
          progress_snapshot?: number | null
          project_id?: string
          status_snapshot?: Database["public"]["Enums"]["project_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          official_assessment_revision_id: string | null
          owner_id: string
          progress: number
          project_type: Database["public"]["Enums"]["project_type"]
          property_address_short: string
          reference_code: string
          seller_nickname: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          summary: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          official_assessment_revision_id?: string | null
          owner_id: string
          progress?: number
          project_type?: Database["public"]["Enums"]["project_type"]
          property_address_short?: string
          reference_code: string
          seller_nickname?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          official_assessment_revision_id?: string | null
          owner_id?: string
          progress?: number
          project_type?: Database["public"]["Enums"]["project_type"]
          property_address_short?: string
          reference_code?: string
          seller_nickname?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_official_assessment_revision_id_fkey"
            columns: ["official_assessment_revision_id"]
            isOneToOne: false
            referencedRelation: "assessment_plan_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_attempts: {
        Row: {
          created_at: string
          email_hash: string
          id: number
          ip_hash: string
        }
        Insert: {
          created_at?: string
          email_hash: string
          id?: never
          ip_hash: string
        }
        Update: {
          created_at?: string
          email_hash?: string
          id?: never
          ip_hash?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          booking_horizon_days: number
          booking_lead_hours: number
          business_name: string
          contact_email: string
          created_at: string
          description: string
          instagram_url: string | null
          linkedin_url: string | null
          phone: string | null
          singleton: boolean
          tagline: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          booking_horizon_days?: number
          booking_lead_hours?: number
          business_name?: string
          contact_email: string
          created_at?: string
          description: string
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          singleton?: boolean
          tagline: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          booking_horizon_days?: number
          booking_lead_hours?: number
          business_name?: string
          contact_email?: string
          created_at?: string
          description?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          singleton?: boolean
          tagline?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_state: "pending" | "active" | "suspended"
      app_role: "owner" | "admin" | "client"
      assessment_approval_status: "pending" | "approved" | "changes_requested"
      assessment_revision_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "changes_requested"
        | "superseded"
      booking_status:
        | "submitted"
        | "confirmed"
        | "reschedule_proposed"
        | "declined"
        | "cancelled"
        | "completed"
      listing_stage_code:
        | "assessment"
        | "cleaning"
        | "remodel"
        | "staging"
        | "photography_marketing"
        | "open_house"
        | "under_contract"
        | "closed"
      listing_stage_status:
        | "not_started"
        | "active"
        | "blocked"
        | "done"
        | "skipped"
      milestone_status: "not_started" | "active" | "blocked" | "done"
      project_request_status:
        | "submitted"
        | "approved"
        | "declined"
        | "withdrawn"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "archived"
      project_type: "real_estate_listing"
      update_audience: "owner" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_state: ["pending", "active", "suspended"],
      app_role: ["owner", "admin", "client"],
      assessment_approval_status: ["pending", "approved", "changes_requested"],
      assessment_revision_status: [
        "draft",
        "pending_approval",
        "approved",
        "changes_requested",
        "superseded",
      ],
      booking_status: [
        "submitted",
        "confirmed",
        "reschedule_proposed",
        "declined",
        "cancelled",
        "completed",
      ],
      listing_stage_code: [
        "assessment",
        "cleaning",
        "remodel",
        "staging",
        "photography_marketing",
        "open_house",
        "under_contract",
        "closed",
      ],
      listing_stage_status: [
        "not_started",
        "active",
        "blocked",
        "done",
        "skipped",
      ],
      milestone_status: ["not_started", "active", "blocked", "done"],
      project_request_status: [
        "submitted",
        "approved",
        "declined",
        "withdrawn",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "archived",
      ],
      project_type: ["real_estate_listing"],
      update_audience: ["owner", "client"],
    },
  },
} as const
