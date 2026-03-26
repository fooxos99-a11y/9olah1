"use client"

import Link from "next/link"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"

const adminGames = [
  {
    title: "من سيربح المليون",
    description: "إدارة الأسئلة والمستويات الخاصة بلعبة المليون.",
    href: "/admin/millionaire-questions",
  },
  {
    title: "خلية الحروف",
    description: "إدارة أسئلة وحروف لعبة خلية الحروف.",
    href: "/admin/letter-hive-questions",
  },
  {
    title: "المسجلين",
    description: "",
    href: "/admin/letter-hive-live-registrations",
  },
  {
    title: "خمن الصورة",
    description: "إدارة المراحل والصور والإجابات الخاصة باللعبة.",
    href: "/admin/guess-images",
  },
  {
    title: "المزاد",
    description: "إضافة وتعديل وحذف أسئلة المزاد.",
    href: "/admin/auction-questions",
  },
  {
    title: "الفئات",
    description: "إدارة التصنيفات والأسئلة والنقاط لكل فئة.",
    href: "/admin/questions",
  },
]

export default function AdminEntryPage() {
  const { isLoading, isVerified } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]" dir="rtl">
        <SiteLoader size="md" />
      </div>
    )
  }

  if (!isVerified) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_45%,#ffffff_100%)]" dir="rtl">
      <Header />
      <main className="flex-1 px-4 py-12 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex rounded-full border border-[#d9cdf8] bg-white px-4 py-2 text-sm font-bold text-[#7c3aed]">
              إدارة الألعاب
            </div>
            <h1 className="text-3xl font-black text-[#1f1147] md:text-5xl">كل الألعاب في صفحة واحدة</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[#5b5570] md:text-base">
              اختر اللعبة التي تريد إدارتها، وسيتم نقلك مباشرة إلى صفحة التحكم الخاصة بها.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adminGames.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className="group rounded-[1.8rem] border border-[#e9e2fb] bg-white p-6 shadow-[0_24px_80px_rgba(124,58,237,0.08)] transition hover:-translate-y-1 hover:border-[#cdb8fb] hover:shadow-[0_30px_90px_rgba(124,58,237,0.14)]"
              >
                <div className="flex h-full flex-col justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-black text-[#1f1147]">{game.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[#5b5570]">{game.description}</p>
                  </div>
                  <Button className="h-12 rounded-2xl bg-[#f6f1ff] text-[#6d28d9] shadow-none group-hover:bg-[#7c3aed] group-hover:text-white">
                    الدخول إلى الإدارة
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}