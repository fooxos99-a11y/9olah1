"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { SiteLoader } from "@/components/ui/site-loader"
import { useVerifiedRoleAccess } from "@/hooks/use-verified-role-access"

function ProtectedLibrary({ children, allowedRoles }: { children: ReactNode; allowedRoles: Array<"subscriber" | "registered" | "admin"> }) {
  const { isLoading, isAuthorized } = useVerifiedRoleAccess(allowedRoles)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

export default function CompetitionsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublicPath = pathname === "/competitions"
    || pathname === "/competitions/letter-hive"
    || pathname?.startsWith("/competitions/letter-hive/")
    || pathname?.startsWith("/competitions/letter-hive-live")

  if (isPublicPath) {
    return <>{children}</>
  }

  return <ProtectedLibrary allowedRoles={["registered", "subscriber", "admin"]}>{children}</ProtectedLibrary>
}