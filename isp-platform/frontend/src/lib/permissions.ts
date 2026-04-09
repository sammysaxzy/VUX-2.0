import type { PermissionFlags, PermissionKey, PermissionRole, PrivilegeMember, Role, User } from "@/types";

export const EMPTY_PERMISSIONS: PermissionFlags = {
  radius_access: false,
  disconnect_user: false,
  create_pppoe: false,
  view_customers: false,
  delete_customer: false,
  billing_access: false,
  settings_access: false,
};

const FULL_PERMISSIONS: PermissionFlags = {
  radius_access: true,
  disconnect_user: true,
  create_pppoe: true,
  view_customers: true,
  delete_customer: true,
  billing_access: true,
  settings_access: true,
};

const PROTECTED_PERMISSION_ROLE_IDS = new Set(["role-1"]);
const PROTECTED_PERMISSION_ROLE_NAMES = new Set(["super admin"]);

const ROLE_FALLBACK_PERMISSIONS: Record<Role, PermissionFlags> = {
  super_admin: FULL_PERMISSIONS,
  tenant_admin: FULL_PERMISSIONS,
  isp_admin: FULL_PERMISSIONS,
  noc_engineer: {
    radius_access: true,
    disconnect_user: true,
    create_pppoe: true,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
  },
  noc_viewer: {
    radius_access: true,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
  },
  field_engineer: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
  },
  admin: FULL_PERMISSIONS,
  support: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: true,
    settings_access: false,
  },
  noc: {
    radius_access: true,
    disconnect_user: true,
    create_pppoe: true,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
  },
};

export function getRolePermissions(role: Role): PermissionFlags {
  return ROLE_FALLBACK_PERMISSIONS[role] ?? EMPTY_PERMISSIONS;
}

export function deriveSimulationRoleFromPermissions(permissions: PermissionFlags): Role {
  if (permissions.settings_access || permissions.delete_customer || permissions.billing_access) {
    return "admin";
  }
  if (permissions.radius_access || permissions.create_pppoe || permissions.disconnect_user) {
    return "noc";
  }
  return "support";
}

export function flattenPermissionMembers(permissionRoles: PermissionRole[]) {
  return permissionRoles.flatMap((permissionRole) =>
    (permissionRole.members ?? []).map((member) => ({
      ...member,
      profileName: permissionRole.name,
      permissions: permissionRole.permissions,
    })),
  );
}

export function isProtectedPermissionRole(role?: Pick<PermissionRole, "id" | "name">) {
  if (!role) return false;
  return PROTECTED_PERMISSION_ROLE_IDS.has(role.id) || PROTECTED_PERMISSION_ROLE_NAMES.has(role.name.trim().toLowerCase());
}

export function isProtectedPrivilegeMember(
  member: Pick<PrivilegeMember, "permissionProfileId">,
  permissionRoles: PermissionRole[],
) {
  const assignedRole = permissionRoles.find((role) => role.id === member.permissionProfileId);
  return isProtectedPermissionRole(assignedRole);
}

export function buildUserFromPermissionMember(
  member: PrivilegeMember,
  permissionRole: PermissionRole,
  tenantId: string,
  previousUser?: User,
): User {
  const resolvedPermissions = permissionRole.permissions;
  const role = deriveSimulationRoleFromPermissions(resolvedPermissions);
  return {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    tenantId,
    permissionProfileId: permissionRole.id,
    role,
    delete_customer: resolvedPermissions.delete_customer,
    permissions: resolvedPermissions,
    ...(previousUser ? { tenantId: previousUser.tenantId } : {}),
  };
}

export function resolveUserPermissions(user?: User): PermissionFlags {
  if (!user) return EMPTY_PERMISSIONS;
  const fallback = ROLE_FALLBACK_PERMISSIONS[user.role] ?? EMPTY_PERMISSIONS;
  return {
    ...fallback,
    ...(user.permissions ?? {}),
  };
}

export function hasPermission(user: User | undefined, permission: PermissionKey) {
  return resolveUserPermissions(user)[permission] === true;
}

export function isAdminRole(role?: Role) {
  return role === "super_admin" || role === "tenant_admin" || role === "isp_admin" || role === "admin";
}

export function canManagePermissions(user?: User) {
  if (!user) return false;
  return isAdminRole(user.role) || resolveUserPermissions(user).settings_access === true;
}
