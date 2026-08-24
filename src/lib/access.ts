import type { Role } from "@/types/domain";

export function isStaffRole(role: Role) {
  return role === "owner" || role === "admin";
}

export function canManageAccount(actor: Role, target: Role) {
  if (target === "owner" || target === "admin") return actor === "owner";
  return actor === "owner" || actor === "admin";
}

export function defaultWorkspace(role: Role) {
  return role === "client" ? "/portal" : "/admin";
}
