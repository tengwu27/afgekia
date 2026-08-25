import type { Role } from "@/types/domain";

export function isAdminRole(role: Role) {
  return role === "admin";
}

export function isOwnerRole(role: Role) {
  return role === "owner";
}

export function defaultWorkspace(role: Role) {
  if (role === "client") return "/portal";
  if (role === "owner") return "/owner";
  return "/admin";
}

export function accountDestination(role: Role, mustChangePassword: boolean) {
  return mustChangePassword ? "/account/security" : defaultWorkspace(role);
}
