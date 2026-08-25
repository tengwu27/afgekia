import type { BookingService, OwnerProjectType, SiteSettings } from "@/types/domain";

const now = "2026-08-25T12:00:00.000Z";
const demoOwnerId = "00000000-0000-4000-8000-000000000001";

export const demoSettings: SiteSettings = {
  singleton: true,
  business_name: "Afgekia",
  tagline: "Clear guidance from listing assessment to close.",
  description: "Afgekia gives sellers a calm, visible path through assessment, preparation, marketing, open house, and closing.",
  contact_email: "hello@afgekia.example",
  phone: null,
  address: null,
  timezone: "America/Los_Angeles",
  instagram_url: null,
  linkedin_url: null,
  booking_lead_hours: 24,
  booking_horizon_days: 90,
  created_at: now,
  updated_at: now,
};

export const demoOwners: OwnerProjectType[] = [{
  owner_id: demoOwnerId,
  project_type: "real_estate_listing",
  display_name: "Afgekia listing support",
  listed: true,
  display_order: 10,
  created_at: now,
  updated_at: now,
}];

export const demoServices: BookingService[] = [{
  id: "10000000-0000-4000-8000-000000000001",
  owner_id: demoOwnerId,
  name: "Listing consultation",
  slug: "listing-consultation",
  description: "A focused conversation about your property, listing timeline, and the next useful step.",
  duration_minutes: 45,
  active: true,
  display_order: 10,
  created_at: now,
  updated_at: now,
}];
