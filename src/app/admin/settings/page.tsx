import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateSettingsAction } from "../actions";

export default async function AdminSettingsPage() {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("singleton", true).single();
  if (!settings) return null;
  return <>
    <WorkspaceHeading eyebrow="Configuration" title="Site settings" description="Business identity, contact details, timezone, and the acceptable booking window." />
    <form action={updateSettingsAction} className="max-w-3xl space-y-6 rounded-xl border bg-card p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="businessName">Business name</Label><Input id="businessName" name="businessName" defaultValue={settings.business_name} required /></div><div className="space-y-2"><Label htmlFor="contactEmail">Contact email</Label><Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings.contact_email} required /></div></div>
      <div className="space-y-2"><Label htmlFor="tagline">Tagline</Label><Input id="tagline" name="tagline" defaultValue={settings.tagline} required /></div>
      <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={settings.description} rows={5} required /></div>
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={settings.phone ?? ""} /></div><div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={settings.address ?? ""} /></div><div className="space-y-2"><Label htmlFor="timezone">Business timezone</Label><Input id="timezone" name="timezone" defaultValue={settings.timezone} required /></div></div>
      <fieldset className="rounded-xl border p-5"><legend className="px-2 text-sm font-medium">Booking limits</legend><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="bookingLeadHours">Minimum lead hours</Label><Input id="bookingLeadHours" name="bookingLeadHours" type="number" min="0" max="720" defaultValue={settings.booking_lead_hours} /></div><div className="space-y-2"><Label htmlFor="bookingHorizonDays">Booking horizon days</Label><Input id="bookingHorizonDays" name="bookingHorizonDays" type="number" min="1" max="730" defaultValue={settings.booking_horizon_days} /></div></div></fieldset>
      <Button type="submit">Save settings</Button>
    </form>
  </>;
}
