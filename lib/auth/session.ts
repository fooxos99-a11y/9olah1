import crypto from "node:crypto"

export type AppRole = "student" | "teacher" | "deputy_teacher" | "admin" | "supervisor"

export type SessionUser = {
  id: string
  name: string
  role: AppRole
  accountNumber: string
  halaqah?: string
  issuedAt: number
  expiresAt: number
}

export const SESSION_COOKIE_NAME = "qabas_session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

function getSessionSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    "qabas-fallback-session-secret"
  )
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function signValue(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export async function createSignedSessionToken(user: Omit<SessionUser, "issuedAt" | "expiresAt">) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS
  const payload: SessionUser = {
    ...user,
    issuedAt,
    expiresAt,
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signValue(encodedPayload)

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  }
}

export async function verifySignedSessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) {
    return null
  }

  const [encodedPayload, providedSignature] = token.split(".")
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = signValue(encodedPayload)
  if (!safeEqual(providedSignature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionUser
    const now = Math.floor(Date.now() / 1000)

    if (!payload?.id || !payload?.role || !payload?.accountNumber) {
      return null
    }

    if (payload.expiresAt <= now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function getCookieValue(cookieHeader: string | null | undefined, cookieName: string) {
  if (!cookieHeader) {
    return null
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))

  if (!cookie) {
    return null
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1))
}

export async function getSessionFromCookieHeader(cookieHeader?: string | null) {
  const token = getCookieValue(cookieHeader, SESSION_COOKIE_NAME)
  return verifySignedSessionToken(token)
}

export function getSessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt * 1000),
  }
}

export function getClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  }
}