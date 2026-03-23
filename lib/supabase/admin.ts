import { createClient } from "@supabase/supabase-js"

function decodeJwtPayload(token: string) {
  const parts = token.split(".")
  if (parts.length < 2) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { ref?: string; role?: string }
  } catch {
    return null
  }
}

export function hasMatchingServiceRoleConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return false
  }

  let hostname = ""
  try {
    hostname = new URL(supabaseUrl).hostname
  } catch {
    return false
  }

  const projectRef = hostname.split(".")[0]
  const payload = decodeJwtPayload(serviceRoleKey)

  return Boolean(payload?.role === "service_role" && payload.ref === projectRef)
}

export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are not set!")
  }

  if (!hasMatchingServiceRoleConfig()) {
    throw new Error("Supabase service role key does not match the configured project")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}