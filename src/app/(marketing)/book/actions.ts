"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasExceededBookingThrottle } from "@/lib/booking-security";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { generateBookingReference } from "@/lib/security";
import { bookingRequestSchema, zodFieldErrors } from "@/lib/validation";
import type { BookingActionState } from "@/types/domain";

export async function submitBookingRequest(_previous: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = bookingRequestSchema.safeParse({
    serviceId: formData.get("serviceId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    timezone: formData.get("timezone"),
    preferredAt: formData.get("preferredAt"),
    alternateAt: formData.get("alternateAt"),
    message: formData.get("message"),
    privacyConsent: formData.get("privacyConsent"),
    formStartedAt: formData.get("formStartedAt"),
    website: formData.get("website"),
  });

  if (!parsed.success) return { status: "error", message: "Please review the marked fields.", fieldErrors: zodFieldErrors(parsed.error) };
  if (!isSupabaseAdminConfigured()) return { status: "error", message: "Booking is not connected yet. Please contact us by email." };

  const supabase = createSupabaseAdminClient();
  const { data: service, error: serviceError } = await supabase.from("booking_services").select("id, active").eq("id", parsed.data.serviceId).eq("active", true).maybeSingle();
  if (serviceError || !service) return { status: "error", message: "That service is no longer available. Please choose another." };

  const { data: settings } = await supabase.from("site_settings").select("booking_lead_hours, booking_horizon_days").eq("singleton", true).single();
  const preferredTime = Date.parse(parsed.data.preferredAt);
  const leadHours = settings?.booking_lead_hours ?? 24;
  const horizonDays = settings?.booking_horizon_days ?? 90;
  if (preferredTime < Date.now() + leadHours * 3_600_000) return { status: "error", message: `Please allow at least ${leadHours} hours before your preferred time.`, fieldErrors: { preferredAt: [`Choose a time at least ${leadHours} hours ahead.`] } };
  if (preferredTime > Date.now() + horizonDays * 86_400_000) return { status: "error", message: `Please choose a time within ${horizonDays} days.`, fieldErrors: { preferredAt: [`Choose a time within ${horizonDays} days.`] } };

  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("email", parsed.data.email).gte("created_at", oneHourAgo);
  if (hasExceededBookingThrottle(count ?? 0)) return { status: "error", message: "We have received several recent requests for this email. Please wait an hour before trying again." };

  const referenceCode = generateBookingReference();
  const { error } = await supabase.from("booking_requests").insert({
    reference_code: referenceCode,
    service_id: parsed.data.serviceId,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    timezone: parsed.data.timezone,
    preferred_at: parsed.data.preferredAt,
    alternate_at: parsed.data.alternateAt,
    message: parsed.data.message,
    privacy_consent_at: new Date().toISOString(),
    status: "submitted",
  });
  if (error) return { status: "error", message: "We couldn’t save the request. Please try again shortly." };

  await supabase.from("audit_events").insert({ action: "booking.requested", entity_type: "booking_request", details: { reference_code: referenceCode, service_id: parsed.data.serviceId } });
  return { status: "success", message: "Your request is safely in the queue.", referenceCode };
}
