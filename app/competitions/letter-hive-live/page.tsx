"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { LetterHiveOnlineEntry } from "@/components/games/letter-hive-online-entry"

export default function LetterHiveLiveEntryPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,rgba(254,243,199,0.42)_18%,transparent_40%),radial-gradient(circle_at_right,#ddd6fe_0%,rgba(221,214,254,0.45)_20%,transparent_42%),linear-gradient(180deg,#fffdf8_0%,#faf7ff_52%,#ffffff_100%)]" dir="rtl">
      <Header />
      <main className="px-4 py-10 md:px-6 md:py-14">
        <LetterHiveOnlineEntry routeBase="/competitions/letter-hive-live" initialPlayersPerTeam={2} registrationClosed closedMessage="تم إغلاق التسجيل في هذه الصفحة حاليًا." />
      </main>
      <Footer />
    </div>
  )
}