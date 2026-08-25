import "server-only";

import { cache } from "react";

import { demoOwners, demoServices, demoSettings } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BookingService, OwnerProjectType, SiteSettings } from "@/types/domain";

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured()) return demoSettings;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_settings").select("*").eq("singleton", true).single();
  return data ?? demoSettings;
});

export const getListedOwners = cache(async (): Promise<OwnerProjectType[]> => {
  if (!isSupabaseConfigured()) return demoOwners;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("owner_project_types").select("*").eq("project_type", "real_estate_listing").eq("listed", true).order("display_order");
  return data ?? [];
});

export const getServices = cache(async (): Promise<BookingService[]> => {
  if (!isSupabaseConfigured()) return demoServices;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("booking_services").select("*").eq("active", true).order("display_order");
  return data ?? [];
});
