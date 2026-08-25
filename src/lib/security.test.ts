import { describe, expect, it } from "vitest";

import { accountDestination, defaultWorkspace, isAdminRole, isOwnerRole } from "@/lib/access";
import { hasExceededBookingThrottle } from "@/lib/booking-security";
import { generateBookingReference, generateProjectReference, generateProjectRequestReference, generateTemporaryPassword } from "@/lib/security";

describe("role checks", () => {
  it("keeps administrator and owner roles distinct", () => { expect(isOwnerRole("owner")).toBe(true); expect(isOwnerRole("admin")).toBe(false); expect(isAdminRole("admin")).toBe(true); expect(isAdminRole("owner")).toBe(false); });
  it("routes roles to their workspace", () => { expect(defaultWorkspace("client")).toBe("/portal"); expect(defaultWorkspace("owner")).toBe("/owner"); expect(defaultWorkspace("admin")).toBe("/admin"); });
  it("routes temporary-password accounts through security", () => { expect(accountDestination("client", true)).toBe("/account/security"); expect(accountDestination("owner", false)).toBe("/owner"); });
});

describe("security helpers", () => {
  it("creates readable unique-looking references", () => { expect(generateBookingReference()).toMatch(/^AF-[A-HJ-NP-Z2-9]{8}$/); expect(generateProjectReference()).toMatch(/^PRJ-[A-HJ-NP-Z2-9]{6}$/); expect(generateProjectRequestReference()).toMatch(/^REQ-[A-HJ-NP-Z2-9]{8}$/); });
  it("creates policy-compatible temporary passwords", () => { const password = generateTemporaryPassword(); expect(password.length).toBeGreaterThanOrEqual(22); expect(password).toMatch(/[a-z]/); expect(password).toMatch(/[A-Z]/); expect(password).toMatch(/[0-9]/); });
  it("throttles at the configured boundary", () => { expect(hasExceededBookingThrottle(2)).toBe(false); expect(hasExceededBookingThrottle(3)).toBe(true); });
});
