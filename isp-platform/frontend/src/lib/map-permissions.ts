import type { MapAccessRole, MapPermission, PermissionRole, User } from "@/types";

export type MapAccessSummary = {
  mapRole: MapAccessRole;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssignClient: boolean;
  canRerouteFibre: boolean;
  canManagePermissions: boolean;
};

const defaultPermissionsByRole: Record<MapAccessRole, MapPermission[]> = {
  admin: ["add", "edit", "delete", "assign_client", "reroute_fibre", "manage_permissions"],
  engineer: ["add", "edit", "assign_client", "reroute_fibre"],
  viewer: [],
};

export function deriveMapRoleFromUserRole(role?: User["role"]): MapAccessRole {
  if (role === "super_admin" || role === "tenant_admin") return "admin";
  if (role === "noc_engineer" || role === "field_engineer") return "engineer";
  return "viewer";
}

export function resolveMapAccess(user?: User, permissionRoles: PermissionRole[] = []): MapAccessSummary {
  const fallbackRole = deriveMapRoleFromUserRole(user?.role);
  const matchedMember = permissionRoles
    .flatMap((role) => role.members ?? [])
    .find((member) => (user?.id && member.userId === user.id) || (user?.email && member.email.toLowerCase() === user.email.toLowerCase()));

  const roleFromDirectory =
    permissionRoles.find((role) => role.mapRole === matchedMember?.mapRole) ??
    permissionRoles.find((role) => role.mapRole === fallbackRole);

  const mapRole = matchedMember?.mapRole ?? roleFromDirectory?.mapRole ?? fallbackRole;
  const grantedPermissions = new Set<MapPermission>([
    ...defaultPermissionsByRole[mapRole],
    ...(roleFromDirectory?.permissions ?? []),
    ...(matchedMember?.canDelete ? (["delete"] as const) : []),
    ...(roleFromDirectory?.canGrantPermissions ? (["manage_permissions"] as const) : []),
  ]);

  return {
    mapRole,
    canAdd: grantedPermissions.has("add"),
    canEdit: grantedPermissions.has("edit"),
    canDelete: grantedPermissions.has("delete"),
    canAssignClient: grantedPermissions.has("assign_client"),
    canRerouteFibre: grantedPermissions.has("reroute_fibre"),
    canManagePermissions: grantedPermissions.has("manage_permissions"),
  };
}
