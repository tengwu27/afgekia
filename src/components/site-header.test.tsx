import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/site-header";
import { getAuthContext } from "@/lib/auth";
import type { AuthContext, Profile, Role } from "@/types/domain";

vi.mock("@/app/actions/auth", () => ({ logoutAction: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthContext: vi.fn() }));

const mockedGetAuthContext = vi.mocked(getAuthContext);

function createAuthContext(role: Role, mustChangePassword = false): AuthContext {
  const profile: Profile = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "member@example.test",
    full_name: "Test Member",
    role,
    state: "active",
    must_change_password: mustChangePassword,
    privacy_consent_at: null,
    timezone: "America/Los_Angeles",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  return { userId: profile.id, email: profile.email, profile };
}

describe("SiteHeader account navigation", () => {
  beforeEach(() => mockedGetAuthContext.mockReset());
  afterEach(cleanup);

  it("offers login to signed-out visitors", async () => {
    mockedGetAuthContext.mockResolvedValue(null);
    render(await SiteHeader());

    expect(screen.getByRole("link", { name: "Client login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it.each([
    ["client", "/portal"],
    ["admin", "/admin"],
    ["owner", "/owner"],
  ] as const)("returns a signed-in %s to the correct dashboard", async (role, href) => {
    mockedGetAuthContext.mockResolvedValue(createAuthContext(role));
    render(await SiteHeader());

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", href);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Client login" })).not.toBeInTheDocument();
  });

  it("routes a temporary-password account to account security", async () => {
    mockedGetAuthContext.mockResolvedValue(createAuthContext("client", true));
    render(await SiteHeader());

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/account/security");
  });
});
