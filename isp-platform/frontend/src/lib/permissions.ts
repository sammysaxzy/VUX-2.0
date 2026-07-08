import type { MemberRole, PermissionFlags, PermissionKey, PermissionRole, PrivilegeMember, Role, User } from "@/types";

export const EMPTY_PERMISSIONS: PermissionFlags = {
  radius_access: false,
  disconnect_user: false,
  create_pppoe: false,
  view_customers: false,
  delete_customer: false,
  billing_access: false,
  settings_access: false,
  inventory_access: false,
  finance_access: false,
};

const FULL_PERMISSIONS: PermissionFlags = {
  radius_access: true,
  disconnect_user: true,
  create_pppoe: true,
  view_customers: true,
  delete_customer: true,
  billing_access: true,
  settings_access: true,
  inventory_access: true,
  finance_access: true,
};

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
    inventory_access: false,
    finance_access: false,
  },
  noc_viewer: {
    radius_access: true,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
    inventory_access: false,
    finance_access: false,
  },
  field_engineer: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
    inventory_access: true,
    finance_access: false,
  },
  accountant: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: true,
    settings_access: false,
    inventory_access: false,
    finance_access: true,
  },
  store_manager: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
    inventory_access: true,
    finance_access: false,
  },
  admin: FULL_PERMISSIONS,
  manager: {
    radius_access: true,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: true,
    settings_access: true,
    inventory_access: true,
    finance_access: true,
  },
  support: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: true,
    settings_access: false,
    inventory_access: false,
    finance_access: true,
  },
  noc: {
    radius_access: true,
    disconnect_user: true,
    create_pppoe: true,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
    inventory_access: false,
    finance_access: false,
  },
  customer_care: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: true,
    settings_access: false,
    inventory_access: false,
    finance_access: false,
  },
  engineer: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: false,
    settings_access: false,
    inventory_access: true,
    finance_access: false,
  },
  finance: {
    radius_access: false,
    disconnect_user: false,
    create_pppoe: false,
    view_customers: true,
    delete_customer: false,
    billing_access: true,
    settings_access: false,
    inventory_access: false,
    finance_access: true,
  },
};

export function getRolePermissions(role: Role): PermissionFlags {
  return ROLE_FALLBACK_PERMISSIONS[role] ?? EMPTY_PERMISSIONS;
}

export function deriveSimulationRoleFromPermissions(permissions: PermissionFlags): Role {
  if (permissions.settings_access || permissions.delete_customer) {
    return "admin";
  }
  if (permissions.finance_access || permissions.billing_access) {
    return "accountant";
  }
  if (permissions.inventory_access) {
    return "store_manager";
  }
  if (permissions.radius_access || permissions.create_pppoe || permissions.disconnect_user) {
    return "noc";
  }
  return "support";
}

function toMemberRole(role: Role): MemberRole {
  if (role === "admin" || role === "super_admin" || role === "tenant_admin" || role === "isp_admin") return "admin";
  if (role === "noc" || role === "noc_engineer" || role === "noc_viewer") return "noc";
  return "support";
}

export function flattenPermissionMembers(permissionRoles: PermissionRole[]) {
  return permissionRoles.flatMap((permissionRole) =>
    (permissionRole.members ?? []).map((member) => ({
      ...member,
      profileName: permissionRole.name,
      permissions: permissionRole.permissionFlags ?? EMPTY_PERMISSIONS,
      role: member.role ?? toMemberRole(deriveSimulationRoleFromPermissions(permissionRole.permissionFlags ?? EMPTY_PERMISSIONS)),
    })),
  );
}

export function buildUserFromPermissionMember(
  member: PrivilegeMember,
  permissionRole: PermissionRole,
  tenantId: string,
  previousUser?: User,
): User {
  const resolvedPermissions = permissionRole.permissionFlags ?? EMPTY_PERMISSIONS;
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
  return Boolean(user && isAdminRole(user.role));
}
