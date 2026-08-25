import { describe, expect, it } from "vitest";

import { hasExceededRegistrationThrottle } from "@/lib/registration-security";

describe("registration throttling", () => {
  it("permits requests below both limits", () => {
    expect(hasExceededRegistrationThrottle(9, 4)).toBe(false);
  });

  it("blocks when either the IP or email limit is reached", () => {
    expect(hasExceededRegistrationThrottle(10, 0)).toBe(true);
    expect(hasExceededRegistrationThrottle(0, 5)).toBe(true);
  });
});
