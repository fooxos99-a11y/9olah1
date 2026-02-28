"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, CircleDollarSign } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase"

export default function StorePage() {
  const [studentPoints, setStudentPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const role = localStorage.getItem("userRole")
    setUserRole(role)

    if (loggedIn && role === "student") {
      fetchStudentData()
      fetchStoreData()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line
  }, [])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      const response = await fetch(`/api/students`)
      const data = await response.json()
      const student = data.students?.find((s: any) => s.account_number === Number(accountNumber))
      if (student) {
        setStudentPoints(student.store_points || 0)
      }
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
    }
  }

  const fetchStoreData = async () => {
    setIsLoading(true)
    const supabase = getSupabase()
    const { data: productsData } = await supabase.from("store_products").select("*")
    const { data: categoriesData } = await supabase.from("store_categories").select("*")
    setProducts(productsData || [])
    setCategories(categoriesData || [])
    setIsLoading(false)
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/store/${categoryId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  if (userRole !== "student") {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 py-12 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <ShoppingBag className="w-16 h-16 text-[#d8a355] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-[#1a2332] mb-2">يظهر للطلاب فقط</h2>
            <p className="text-lg text-gray-600">هذا القسم متاح للطلاب المسجلين فقط</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />
              <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المتجر</h1>
            </div>
            <p className="text-base md:text-lg text-gray-600">استخدم نقاطك لشراء منتجات مميزة</p>
          </div>

          {/* Points Card */}
          <div className="relative bg-gradient-to-br from-[#00312e] via-[#023232] to-[#001a18] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-12 text-white shadow-2xl overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#d8a355]/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#d8a355]/8 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center justify-center p-2 md:p-4">
              {/* Coin circle */}
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(145deg, #f5c96a, #b8843a)', boxShadow: '0 0 24px 6px rgba(216,163,85,0.4), inset 0 2px 4px rgba(255,255,255,0.3)' }}>
                <div className="absolute inset-1 rounded-full border border-white/20" />
                <CircleDollarSign className="w-7 h-7 md:w-9 md:h-9 text-[#3d2000]" strokeWidth={2.5} />
              </div>

              {/* Points number */}
              <div className="text-5xl md:text-6xl font-black leading-none tracking-tight"
                style={{ color: '#f5c96a', textShadow: '0 0 30px rgba(216,163,85,0.6), 0 2px 0 rgba(0,0,0,0.4)' }}>
                {studentPoints}
              </div>

              {/* Label */}
              <div className="mt-2 flex items-center gap-1.5">
                <div className="w-6 h-px bg-[#d8a355]/40" />
                <p className="text-xs md:text-sm font-semibold tracking-widest opacity-70">نقطة متاحة للشراء</p>
                <div className="w-6 h-px bg-[#d8a355]/40" />
              </div>
            </div>
          </div>

          {/* Products by Category */}
          <div className="space-y-14 mb-8 md:mb-16">
            {categories.length === 0 ? (
              <div className="text-center text-gray-400 py-16">لا توجد فئات متاحة حالياً</div>
            ) : (
              categories.map((category) => {
                const categoryProducts = products.filter((prod) => prod.category_id === category.id)
                return (
                  <div key={category.id}>
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#d8a355]/30" />
                      <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#d8a355]/40 bg-[#fdf8f0]">
                        <ShoppingBag className="w-4 h-4 text-[#d8a355]" />
                        <h2 className="text-base md:text-lg font-bold text-[#1a2332]">{category.name}</h2>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#d8a355]/30" />
                    </div>

                    {categoryProducts.length === 0 ? (
                      <div className="text-center text-gray-300 py-8 text-sm">لا توجد منتجات في هذه الفئة</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
                        {categoryProducts.map((prod) => (
                          <div key={prod.id} className="group flex flex-col bg-white rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg"
                            style={{ border: '1px solid #e5e7eb' }}>

                            {/* Image */}
                            <div className="relative w-full bg-white flex items-center justify-center p-3 md:p-5 h-56 md:h-72">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name}
                                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                              ) : (
                                <ShoppingBag className="w-16 h-16 text-gray-200" />
                              )}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 mx-3" />

                            {/* Info */}
                            <div className="flex flex-col flex-1 p-4 md:p-5 gap-3">
                              {/* Name */}
                              <p className="text-base md:text-lg font-semibold text-gray-800 leading-snug line-clamp-2 h-12 md:h-14">
                                {prod.name}
                              </p>

                              {/* Buy button */}
                              <button
                                className="w-full py-3.5 rounded-xl text-base md:text-lg font-black transition-all duration-150 active:scale-95 hover:opacity-90 mt-1 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #00352f 0%, #00453e 100%)', color: '#f5c96a' }}
                                onClick={async () => {
                                  const accountNumber = localStorage.getItem("accountNumber")
                                  const studentsRes = await fetch(`/api/students`)
                                  const studentsData = await studentsRes.json()
                                  const student = studentsData.students?.find((s: any) => s.account_number === Number(accountNumber))
                                  if (!student) {
                                    toast({ title: "خطأ", description: "لم يتم العثور على الطالب", variant: "destructive" })
                                    return
                                  }
                                  if ((student.store_points ?? 0) < prod.price) {
                                    toast({ title: "نقاط المتجر غير كافية", description: `لا تملك نقاط متجر كافية لشراء هذا المنتج`, variant: "destructive" })
                                    return
                                  }
                                  const res = await fetch("/api/store-orders", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      student_id: student.id,
                                      student_name: student.name,
                                      product_id: prod.id,
                                      product_name: prod.name,
                                      price: prod.price,
                                    })
                                  })
                                  const data = await res.json()
                                  if (res.ok && data.success) {
                                    setStudentPoints(data.remaining_store_points)
                                    toast({ title: "تم الشراء بنجاح ✓" })
                                  } else {
                                    toast({ title: "فشل الشراء", description: data.error || "حدث خطأ غير متوقع", variant: "destructive" })
                                  }
                                }}
                              >
                                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                                  style={{
                                    background: 'radial-gradient(circle at 35% 30%, #fde68a 0%, #f5c96a 40%, #b8762a 100%)',
                                  }}>
                                  <span className="text-[8px] font-black" style={{ color: '#5a3000', display: 'inline-block', transform: 'rotate(-10deg)' }}>$</span>
                                </div>
                                {prod.price} نقطة
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Info Section */}
          <div className="bg-[#faf9f6] rounded-xl md:rounded-2xl p-6 md:p-8 border-2 border-[#d8a355]/20">
            <h2 className="text-xl md:text-2xl font-bold text-[#1a2332] mb-3 md:mb-4">كيف يعمل المتجر؟</h2>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-gray-700">
              <li className="flex items-start gap-2 md:gap-3">
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-[#d8a355] mt-1 flex-shrink-0" />
                <span>استخدم نقاطك المكتسبة من التحضير والإنجاز لشراء المنتجات</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-[#d8a355] mt-1 flex-shrink-0" />
                <span>كل فئة لديها منتجات مختلفة ومميزة</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-[#d8a355] mt-1 flex-shrink-0" />
                <span>نقاط ملفك الشخصي وترتيبك في اللائحة لا تتأثر بالشراء</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
