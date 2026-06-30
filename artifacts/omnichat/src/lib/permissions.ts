export function canAccessAdminFeatures(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "superadmin";
}
