export function isAdminEmail(email?: string | null): boolean {
  return !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL
}
