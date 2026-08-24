import { describe, expect, it } from "vitest";

import { canManageAccount, defaultWorkspace, isStaffRole } from "@/lib/access";
import { hasExceededBookingThrottle } from "@/lib/booking-security";
import { generateBookingReference, generateProjectReference, generateTemporaryPassword } from "@/lib/security";

describe("role checks", () => {
  it("separates staff from clients", () => { expect(isStaffRole("owner")).toBe(true); expect(isStaffRole("admin")).toBe(true); expect(isStaffRole("client")).toBe(false); });
  it("reserves staff management for the owner", () => { expect(canManageAccount("owner", "admin")).toBe(true); expect(canManageAccount("admin", "admin")).toBe(false); expect(canManageAccount("admin", "client")).toBe(true); });
  it("routes roles to their workspace", () => { expect(defaultWorkspace("client")).toBe("/portal"); expect(defaultWorkspace("admin")).toBe("/admin"); });
});

describe("security helpers", () => {
  it("creates readable unique-looking references", () => { expect(generateBookingReference()).toMatch(/^AF-[A-HJ-NP-Z2-9]{8}$/); expect(generateProjectReference()).toMatch(/^PRJ-[A-HJ-NP-Z2-9]{6}$/); });
  it("creates policy-compatible temporary passwords", () => { const password = generateTemporaryPassword(); expect(password.length).toBeGreaterThanOrEqual(22); expect(password).toMatch(/[a-z]/); expect(password).toMatch(/[A-Z]/); expect(password).toMatch(/[0-9]/); });
  it("throttles at the configured boundary", () => { expect(hasExceededBookingThrottle(2)).toBe(false); expect(hasExceededBookingThrottle(3)).toBe(true); });
});
