"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Trash2, ArrowRight, Shield, Info } from 'lucide-react'
import { createClient } from "@/lib/supabase/client"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"

interface Admin {
  id: string
  name: string
  account_number: number
  phone_number?: string
  id_number?: string
}

export default function AdminsManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const confirmDialog = useConfirmDialog()

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    account_number: "",
    phone_number: "",
    id_number: "",
  })

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole !== "admin") {
      router.push("/login")
    } else {
      fetchAdmins()
    }
  }, [router])

  const fetchAdmins = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "admin")
        .order("account_number", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching admins:", error)
        return
      }

      if (data) {
        setAdmins(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching admins:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name.trim() || !newAdmin.account_number.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("users")
        .insert({
          name: newAdmin.name,
          account_number: Number.parseInt(newAdmin.account_number),
          phone_number: newAdmin.phone_number || null,
          id_number: newAdmin.id_number || null,
          role: "admin",
        })
        .select()

      if (error) {
        console.error("[v0] Error adding admin:", error)
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إضافة الإداري",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "✓ تم الحفظ بنجاح",
        description: `تم إضافة الإداري ${newAdmin.name} بنجاح`,
        className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
      })

      setNewAdmin({
        name: "",
        account_number: "",
        phone_number: "",
        id_number: "",
      })
      setIsAddDialogOpen(false)
      fetchAdmins()
    } catch (error) {
      console.error("[v0] Error adding admin:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الإداري",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    const confirmed = await confirmDialog({
      title: "تأكيد حذف الإداري",
      description: `هل أنت متأكد من حذف الإداري ${adminName}؟`,
      confirmText: "نعم، احذف",
      cancelText: "إلغاء",
    })

    if (!confirmed) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from("users").delete().eq("id", adminId)

      if (error) {
        console.error("[v0] Error deleting admin:", error)
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حذف الإداري",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "✓ تم الحذف بنجاح",
        description: `تم حذف الإداري ${adminName} بنجاح`,
        className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
      })

      fetchAdmins()
    } catch (error) {
      console.error("[v0] Error deleting admin:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الإداري",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]" dir="rtl">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">

          {/* Page Header */}
          <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-lg border border-[#D4AF37]/40 flex items-center justify-center text-[#C9A961] hover:bg-[#D4AF37]/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">إدارة الإداريين</h1>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors">
                  <UserPlus className="w-4 h-4" />
                  إضافة إداري
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="text-xl text-[#1a2332]">إضافة إداري جديد</DialogTitle>
                  <DialogDescription className="text-sm text-neutral-500">أدخل بيانات الإداري الجديد</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1a2332]">الاسم الكامل *</Label>
                    <Input
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      placeholder="أدخل اسم الإداري"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1a2332]">رقم الحساب *</Label>
                    <Input
                      type="number"
                      value={newAdmin.account_number}
                      onChange={(e) => setNewAdmin({ ...newAdmin, account_number: e.target.value })}
                      placeholder="أدخل رقم الحساب"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                    <Input
                      value={newAdmin.id_number}
                      onChange={(e) => setNewAdmin({ ...newAdmin, id_number: e.target.value })}
                      placeholder="اختياري"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                    <Input
                      value={newAdmin.phone_number}
                      onChange={(e) => setNewAdmin({ ...newAdmin, phone_number: e.target.value })}
                      placeholder="اختياري"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#D4AF37]/50 text-neutral-600">إلغاء</Button>
                  <Button
                    onClick={handleAddAdmin}
                    disabled={isSubmitting}
                    className="border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37]"
                  >
                    {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Admins List */}
          {admins.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <p className="text-lg font-semibold text-neutral-500">لا يوجد إداريين مسجلين</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#D4AF37]/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">قائمة الإداريين</h2>
                <span className="mr-auto text-sm text-neutral-400">{admins.length} إداري</span>
              </div>
              <div className="divide-y divide-[#D4AF37]/20">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#D4AF37]/3 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1a2332]">{admin.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedAdmin(admin); setIsInfoDialogOpen(true) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/50 text-[#C9A961] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] text-sm font-medium transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                        عرض
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-[420px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">بيانات الحساب</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">معلومات الإداري</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-3 py-2">
              {[
                { label: "الاسم", value: selectedAdmin.name },
                { label: "رقم الحساب", value: String(selectedAdmin.account_number) },
                { label: "رقم الهوية", value: selectedAdmin.id_number || "—" },
                { label: "رقم الجوال", value: selectedAdmin.phone_number || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-4 py-3 bg-[#fafaf9] rounded-xl border border-[#D4AF37]/20">
                  <span className="text-sm font-semibold text-neutral-500">{label}</span>
                  <span className="text-sm font-bold text-[#1a2332]" dir="ltr">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
