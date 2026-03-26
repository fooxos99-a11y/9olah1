"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogIn, LogOut, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { clearClientAuth, getCachedClientAuth, persistClientAuth, setCachedClientAuth } from "@/lib/auth/client"

const navItems = [
  { href: "/", label: "الرئيسية" },
  { href: "/competitions", label: "الألعاب" },
  { href: "/contact", label: "تواصل معنا" },
  { href: "/competitions/letter-hive-live", label: "البطولة" },
  { href: "/admin", label: "لوحة التحكم" },
]

const ADMIN_ROLES = ["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]

type HeaderUser = {
  id: string
  name: string
  role: string
  accountNumber: string
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [authResolved, setAuthResolved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrateUser() {
      const cachedUser = getCachedClientAuth()
      if (!cancelled && cachedUser) {
        setUser(cachedUser)
        setAuthResolved(true)
      }

      try {
        const response = await fetch("/api/auth", { method: "GET", cache: "no-store" })
        if (response.ok) {
          const data = await response.json()
          if (!cancelled && data?.user) {
            const nextUser = {
              id: data.user.id,
              name: data.user.name,
              role: data.user.role,
              accountNumber: String(data.user.accountNumber),
            }
            persistClientAuth(nextUser)
            setUser(nextUser)
            setAuthResolved(true)
            return
          }
        }
      } catch {
        // Fallback to localStorage below.
      }

      if (!cachedUser) {
        if (!cancelled) {
          setCachedClientAuth(null)
          setUser(null)
          setAuthResolved(true)
        }
        return
      }

      if (!cancelled) {
        setUser(cachedUser)
        setAuthResolved(true)
      }
    }

    void hydrateUser()

    const handlePageShow = () => {
      void hydrateUser()
    }

    window.addEventListener("pageshow", handlePageShow)

    return () => {
      cancelled = true
      window.removeEventListener("pageshow", handlePageShow)
    }
  }, [pathname])

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false
  const userMenuItems = [
    { href: "/profile", label: "الملف الشخصي" },
    ...(isAdmin
      ? [
          { href: "/admin/statistics", label: "الإحصائيات" },
          { href: "/admin", label: "لوحة التحكم" },
          { href: "/admin/contact-messages", label: "رسائل التواصل" },
        ]
      : []),
  ]

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" })
    } finally {
      clearClientAuth()
      setUser(null)
      setMenuOpen(false)
      router.push("/")
      router.refresh()
    }
  }

  const isNavItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }

    if (href === "/competitions") {
      return pathname === "/competitions"
    }

    return pathname === href || pathname?.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#7c3aed]/10 bg-white/95 backdrop-blur" dir="rtl">
      <div className="container relative mx-auto flex items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="relative inline-flex items-center py-1 text-xl font-black tracking-[-0.04em] text-transparent md:text-2xl"
        >
          <span className="bg-gradient-to-l from-[#7c3aed] via-[#4c1d95] to-[#1f1147] bg-clip-text">صولة وجولة</span>
          <span className="pointer-events-none absolute -bottom-1 right-0 h-[3px] w-10 rounded-full bg-gradient-to-l from-[#c4b5fd] to-[#7c3aed] md:w-12" />
        </Link>

        <nav className="hidden items-center gap-3 md:absolute md:left-1/2 md:top-1/2 md:flex md:-translate-x-1/2 md:-translate-y-1/2">
          {navItems.filter((item) => item.href !== "/admin" || isAdmin).map((item) => {
            const isActive = isNavItemActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-5 py-2.5 text-base font-semibold transition-colors ${
                  isActive ? "bg-[#7c3aed] text-white" : "text-[#4c1d95] hover:bg-[#f3e8ff]"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e5dafd] bg-white shadow-[0_16px_40px_rgba(124,58,237,0.12)] transition hover:border-[#cdb8fb] hover:bg-[#fcfaff]"
                  aria-label="قائمة الحساب"
                >
                  <Avatar className="h-9 w-9 border border-[#7c3aed]/10 bg-[#f7f2ff]">
                    <AvatarFallback className="bg-[#7c3aed]/10 text-[#6d28d9]">
                      <User className="h-4.5 w-4.5" />
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border border-black/15 bg-white shadow-[0_20px_45px_rgba(0,0,0,0.12)]">
                <DropdownMenuGroup>
                  {userMenuItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild className="justify-end rounded-xl text-right text-[#1f1147] focus:bg-[#f7f2ff] focus:text-[#1f1147]">
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={handleLogout} variant="destructive" className="justify-end rounded-xl text-right focus:bg-red-50">
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !authResolved ? (
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e5dafd] bg-white shadow-[0_16px_40px_rgba(124,58,237,0.08)]">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[#f3e8ff]" />
            </div>
          ) : (
            <Button asChild className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                <Link href="/login"><LogIn className="h-4 w-4" />دخول</Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#7c3aed]/20 text-[#4c1d95] md:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-[#7c3aed]/10 bg-white md:hidden">
          <div className="container mx-auto space-y-2 px-4 py-4">
            {navItems.filter((item) => item.href !== "/admin" || isAdmin).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-base font-semibold text-[#4c1d95] hover:bg-[#f3e8ff]"
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <>
                {userMenuItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-base font-semibold text-[#4c1d95] hover:bg-[#f3e8ff]">
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl px-4 py-3 text-right text-base font-semibold text-red-600 hover:bg-red-50"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : !authResolved ? (
              <div className="grid gap-2 pt-2">
                <div className="h-11 w-full animate-pulse rounded-xl bg-[#f3e8ff]" />
              </div>
            ) : (
              <div className="grid gap-2 pt-2">
                <Button asChild className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                  <Link href="/login" onClick={() => setMenuOpen(false)}><LogIn className="h-4 w-4" />دخول</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
