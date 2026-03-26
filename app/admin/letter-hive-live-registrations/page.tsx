"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Registration = {
  id: string
  team_name: string
  player_one_name: string
  player_two_name: string
  submitted_by_name: string | null
  status: "new" | "reviewed"
  created_at?: string
}

export default function AdminLetterHiveLiveRegistrationsPage() {
  const { isLoading: authLoading, isVerified } = useAdminAuth()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  const loadRegistrations = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/letter-hive-live/registrations", { cache: "no-store" })
      const data = await response.json()

      if (response.ok) {
        setRegistrations(data.registrations || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isVerified) {
      void loadRegistrations()
    }
  }, [authLoading, isVerified])

  const updateStatus = async (id: string, status: Registration["status"]) => {
    await fetch("/api/letter-hive-live/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })

    await loadRegistrations()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_50%,#ffffff_100%)]" dir="rtl">
        <SiteLoader size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_50%,#ffffff_100%)] px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-[#7c3aed]/10 bg-white p-6 shadow-[0_24px_80px_rgba(124,58,237,0.08)] md:p-8">
          <div className="text-sm font-bold text-[#7c3aed]">لوحة الإدارة</div>
          <h1 className="mt-2 text-3xl font-black text-[#1f1147] md:text-4xl">المسجلين</h1>
        </div>

        <div className="space-y-4">
          {registrations.length === 0 ? (
            <div className="rounded-[1.6rem] border border-[#7c3aed]/10 bg-white p-6 text-center text-[#5b5570] shadow-[0_18px_50px_rgba(124,58,237,0.06)]">
              لا يوجد مسجلون حتى الآن.
            </div>
          ) : (
            registrations.map((registration) => (
              <div key={registration.id} className="rounded-[1.6rem] border border-[#7c3aed]/10 bg-white p-6 shadow-[0_18px_50px_rgba(124,58,237,0.06)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black text-[#1f1147]">{registration.team_name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${registration.status === "new" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#ecfdf5] text-[#047857]"}`}>
                        {registration.status === "new" ? "جديد" : "تمت المراجعة"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#6d28d9]">{registration.player_one_name} - {registration.player_two_name}</p>
                    <p className="text-sm text-[#5b5570]">المسجل: {registration.submitted_by_name || "زائر"}</p>
                    <div className="text-xs text-[#8a83a8]">{registration.created_at ? new Date(registration.created_at).toLocaleString("ar-SA") : ""}</div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => updateStatus(registration.id, registration.status === "new" ? "reviewed" : "new")}
                      variant="outline"
                      className="border-[#c4b5fd] text-[#6d28d9] hover:bg-[#f5f3ff]"
                    >
                      {registration.status === "new" ? "تحديد كمراجع" : "إعادة كجديد"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}