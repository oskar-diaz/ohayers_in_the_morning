export const ADMIN_EMAILS = new Set(["koki142@gmail.com"]);

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || "";
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);

  return Boolean(normalizedEmail && ADMIN_EMAILS.has(normalizedEmail));
}
