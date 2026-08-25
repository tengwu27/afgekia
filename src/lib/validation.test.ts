import { describe, expect, it } from "vitest";

import { bookingRequestSchema, isBookingTransitionAllowed, isIanaTimezone, isProjectTransitionAllowed, projectSchema, projectStageSchema, validateProgressForStatus } from "@/lib/validation";

function validBooking() {
  return { ownerId: "00000000-0000-4000-8000-000000000001", serviceId: "10000000-0000-4000-8000-000000000001", fullName: "Ada Client", email: "ADA@EXAMPLE.COM", phone: "", timezone: "America/Los_Angeles", preferredAt: new Date(Date.now() + 172_800_000).toISOString(), alternateAt: "", message: "I need help creating a calmer delivery plan for our launch.", privacyConsent: "on", formStartedAt: Date.now() - 10_000, website: "" };
}

describe("booking validation", () => {
  it("normalizes a valid request", () => { const result = bookingRequestSchema.parse(validBooking()); expect(result.email).toBe("ada@example.com"); expect(result.phone).toBeNull(); expect(result.alternateAt).toBeNull(); });
  it("rejects a honeypot value", () => { expect(bookingRequestSchema.safeParse({ ...validBooking(), website: "bot.example" }).success).toBe(false); });
  it("rejects an impossibly fast submission", () => { expect(bookingRequestSchema.safeParse({ ...validBooking(), formStartedAt: Date.now() }).success).toBe(false); });
  it("rejects a past preferred time", () => { expect(bookingRequestSchema.safeParse({ ...validBooking(), preferredAt: new Date(Date.now() - 1000).toISOString() }).success).toBe(false); });
  it("requires an IANA timezone", () => { expect(isIanaTimezone("America/Los_Angeles")).toBe(true); expect(isIanaTimezone("Pacific-ish")).toBe(false); });
});

describe("status and progress rules", () => {
  it("allows the normal project path", () => { expect(isProjectTransitionAllowed("planning", "active")).toBe(true); expect(isProjectTransitionAllowed("active", "completed")).toBe(true); });
  it("rejects an unsupported project jump", () => { expect(isProjectTransitionAllowed("planning", "completed")).toBe(false); });
  it("requires completed work to be 100 percent", () => { expect(validateProgressForStatus("completed", 99)).toMatch(/100%/); expect(validateProgressForStatus("completed", 100)).toBeNull(); });
  it("enforces terminal booking states", () => { expect(isBookingTransitionAllowed("submitted", "confirmed")).toBe(true); expect(isBookingTransitionAllowed("completed", "confirmed")).toBe(false); });
});

describe("listing project validation", () => {
  it("requires a property identity instead of a generic title", () => {
    const parsed = projectSchema.parse({
      propertyAddressShort: "1248 Cedar Ave",
      sellerNickname: "The Parkers",
      summary: "A seller-facing summary for the listing preparation project.",
      description: "",
      clientUserId: "",
      startDate: "",
      targetDate: "",
    });
    expect(parsed.propertyAddressShort).toBe("1248 Cedar Ave");
  });

  it("requires reasons for skipped and material stage changes", () => {
    const base = {
      projectId: "10000000-0000-4000-8000-000000000001",
      stageId: "20000000-0000-4000-8000-000000000001",
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-05",
      changeReason: "",
    };
    expect(
      projectStageSchema.safeParse({
        ...base,
        status: "skipped",
        skipReason: "",
        changeType: "minor",
      }).success,
    ).toBe(false);
    expect(
      projectStageSchema.safeParse({
        ...base,
        status: "active",
        skipReason: "",
        changeType: "material",
      }).success,
    ).toBe(false);
  });
});
