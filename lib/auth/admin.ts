import { forbiddenResponse, unauthorizedResponse } from "@/lib/auth/guards"
import { getSessionFromCookieHeader } from "@/lib/auth/session"

export const ADMIN_ROLES = new Set(["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"])

export async function requireAdminSession(request: Request) {
  const session = await getSessionFromCookieHeader(request.headers.get("cookie"))

  if (!session) {
    return { response: unauthorizedResponse() }
  }

  if (!ADMIN_ROLES.has(session.role)) {
    return { response: forbiddenResponse() }
  }

  return { session }
}