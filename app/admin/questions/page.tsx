"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { 
  Trash2, 
  Edit, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Trophy, 
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Question = {
  id: string
  category_id: string
  question: string
  answer: string
  points: number
}

type Category = {
  id: string
  name: string
  questions: Question[]
}

export default function QuestionsDatabase() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الألعاب");

  const [categories, setCategories] = useState<Category[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [deleteItem, setDeleteItem] = useState<{ type: "category" | "question", id: string } | null>(null)
  
  const [categoryName, setCategoryName] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [answerText, setAnswerText] = useState("")
  const [pointsValue, setPointsValue] = useState(200)

  useEffect(() => {
    if (!authVerified) {
      return
    }

    fetchCategories()
  }, [authVerified])

  const ensureAdminSessionCookie = async () => {
    const accountNumber = localStorage.getItem("accountNumber")

    if (!accountNumber) {
      return false
    }

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_number: accountNumber }),
    })

    return response.ok
  }

  const adminFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let response = await fetch(input, init)

    if (response.status !== 401) {
      return response
    }

    const restored = await ensureAdminSessionCookie()
    if (!restored) {
      return response
    }

    response = await fetch(input, init)
    return response
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories", { cache: "no-store" })

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`)
      }

      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleCategorySubmit = async () => {
    if (!categoryName.trim()) return
    try {
      if (editingCategory) {
        await adminFetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategory.id, name: categoryName }),
        })
      } else {
        await adminFetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryName }),
        })
      }
      await fetchCategories()
      setShowCategoryDialog(false)
      resetCategoryForm()
    } catch (error) {
      console.error("Error saving category:", error)
    }
  }

  const handleQuestionSubmit = async () => {
    if (!questionText.trim() || !answerText.trim()) return
    try {
      if (editingQuestion) {
        await adminFetch("/api/admin/category-questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingQuestion.id,
            question: questionText,
            answer: answerText,
            points: pointsValue,
          }),
        })
      } else {
        await adminFetch("/api/admin/category-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: selectedCategoryId,
            question: questionText,
            answer: answerText,
            points: pointsValue,
          }),
        })
      }
      await fetchCategories()
      setShowQuestionDialog(false)
      resetQuestionForm()
    } catch (error) {
      console.error("Error saving question:", error)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      if (deleteItem.type === "category") {
        await adminFetch(`/api/admin/categories?id=${deleteItem.id}`, { method: "DELETE" })
      } else {
        await adminFetch(`/api/admin/category-questions?id=${deleteItem.id}`, { method: "DELETE" })
      }
      await fetchCategories()
      setShowDeleteDialog(false)
      setDeleteItem(null)
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  const resetCategoryForm = () => { setCategoryName(""); setEditingCategory(null); }
  const resetQuestionForm = () => {
    setQuestionText(""); setAnswerText(""); setPointsValue(200);
    setEditingQuestion(null); setSelectedCategoryId("");
  }

  const openAddCategoryDialog = () => { resetCategoryForm(); setShowCategoryDialog(true); }
  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category); setCategoryName(category.name); setShowCategoryDialog(true);
  }
  const openAddQuestionDialog = (categoryId: string) => {
    resetQuestionForm(); setSelectedCategoryId(categoryId); setShowQuestionDialog(true);
  }
  const openEditQuestionDialog = (question: Question) => {
    setEditingQuestion(question); setQuestionText(question.question);
    setAnswerText(question.answer); setPointsValue(question.points);
    setSelectedCategoryId(question.category_id); setShowQuestionDialog(true);
  }
  const openDeleteDialog = (type: "category" | "question", id: string) => {
    setDeleteItem({ type, id }); setShowDeleteDialog(true);
  }

  if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_45%,#ffffff_100%)]">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/*Header Section */}
          <div className="bg-white/95 rounded-3xl p-6 sm:p-8 shadow-[0_24px_80px_rgba(124,58,237,0.08)] border border-[#7c3aed]/15 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#7c3aed]/10 rounded-2xl flex items-center justify-center text-[#7c3aed]">
                <Database size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1f1147]">قاعدة الأسئلة</h1>
              </div>
            </div>
            <Button
              onClick={openAddCategoryDialog}
              variant="outline"
              className="w-full sm:w-auto border-[#7c3aed]/25 text-[#6d28d9] rounded-xl h-10 px-6 hover:bg-[#f5f3ff] hover:text-[#5b21b6]"
            >
              <Plus className="ml-2" size={20} />
              إضافة فئة جديدة
            </Button>
          </div>

          {/* Categories List */}
          <div className="space-y-6">
            {categories.length > 0 ? (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(124,58,237,0.08)] border border-[#7c3aed]/12 overflow-hidden transition-all"
                >
                  {/* Category Header */}
                  <div 
                    className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${
                      expandedCategories.has(category.id) ? 'bg-[#faf7ff] border-b border-[#7c3aed]/10' : 'hover:bg-[#faf7ff]/80'
                    }`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg transition-colors ${
                        expandedCategories.has(category.id) ? 'bg-[#7c3aed] text-white' : 'bg-[#f3efff] text-[#8b79c9]'
                      }`}>
                        {expandedCategories.has(category.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#1f1147] flex items-center gap-2">
                          <Layers size={18} className="text-[#7c3aed]" />
                          {category.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-xs font-medium text-[#7c3aed] bg-[#f5f3ff] px-2 py-0.5 rounded-md">
                             {category.questions?.length || 0} أسئلة
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        onClick={() => openAddQuestionDialog(category.id)}
                        variant="outline"
                        size="sm"
                        className="border-[#7c3aed]/20 text-[#6d28d9] hover:bg-[#f5f3ff] hover:border-[#7c3aed]/35 rounded-lg px-4"
                      >
                        <Plus size={16} className="ml-1" />
                        سؤال
                      </Button>
                      <Button
                        onClick={() => openEditCategoryDialog(category)}
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-[#7c3aed] hover:bg-[#f5f3ff]"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        onClick={() => openDeleteDialog("category", category.id)}
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>

                  {/* Questions Grid */}
                  {expandedCategories.has(category.id) && (
                    <div className="p-6 bg-white animate-in fade-in slide-in-from-top-2 duration-300">
                      {category.questions && category.questions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {category.questions.map((question) => (
                            <div
                              key={question.id}
                              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[#ede7ff] bg-[#fcfbff] hover:bg-white hover:border-[#7c3aed]/25 hover:shadow-md transition-all"
                            >
                              <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 bg-[#7c3aed] text-white">
                                    <Trophy size={10} />
                                    {question.points} نقطة
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <HelpCircle className="text-[#8b79c9] mt-1 shrink-0" size={18} />
                                    <p className="text-lg font-bold text-[#1f1147] leading-tight">
                                      {question.question}
                                    </p>
                                  </div>
                                  <div className="flex items-start gap-2 mr-6">
                                    <CheckCircle2 className="text-[#7c3aed] mt-0.5 shrink-0" size={16} />
                                    <p className="text-[#5b5570] font-medium">
                                      {question.answer}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  onClick={() => openEditQuestionDialog(question)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-slate-400 hover:text-[#7c3aed] rounded-full hover:bg-[#f5f3ff]"
                                >
                                  <Edit size={18} />
                                </Button>
                                <Button
                                  onClick={() => openDeleteDialog("question", question.id)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-slate-400 hover:text-red-500 rounded-full"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-[#8b79c9]">
                          <AlertCircle size={40} className="mb-2 opacity-20" />
                          <p>لا توجد أسئلة في هذه الفئة بعد</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl border-2 border-dashed border-[#d9d2f6] py-24 text-center shadow-[0_20px_60px_rgba(124,58,237,0.06)]">
                <div className="w-24 h-24 bg-[#f5f3ff] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Layers className="text-[#c4b5fd]" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-[#1f1147]">القاعدة فارغة</h3>
                <p className="text-[#8b79c9] mt-2 max-w-xs mx-auto">
                  ابدأ بإضافة فئات جديدة لتمكين اللاعبين من اختيار أسئلتهم المفضلة
                </p>
                <Button 
                  onClick={openAddCategoryDialog}
                  variant="link" 
                  className="text-[#7c3aed] mt-4 font-bold text-lg"
                >
                  أضف أول فئة الآن
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent showCloseButton={false} className="max-w-md overflow-hidden rounded-2xl border border-[#7c3aed]/15 bg-white p-0 shadow-[0_24px_80px_rgba(124,58,237,0.12)]" dir="rtl">
          <DialogTitle className="sr-only">{editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
          <DialogHeader className="px-6 py-5 border-b border-[#7c3aed]/15 bg-gradient-to-r from-[#f5f3ff] to-transparent">
            <DialogTitle className="flex w-full justify-start pr-2 text-right text-lg font-bold text-[#1a2332]">
              <span className="inline-flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#7c3aed]" />
                <span>{editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#1a2332] px-1">اسم الفئة</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="مثال: التاريخ، العلوم، الرياضة..."
                className="h-10 rounded-xl border-[#7c3aed]/25 focus-visible:ring-[#7c3aed]/20 focus-visible:border-[#7c3aed] text-sm"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-[#7c3aed]/15 flex gap-3">
              <Button 
                onClick={handleCategorySubmit} 
                className="flex-1 h-10 rounded-lg bg-[#7c3aed] text-white font-medium transition-colors hover:bg-[#6d28d9]"
              >
                {editingCategory ? "حفظ التعديلات" : "حفظ"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCategoryDialog(false)}
                className="border-[#7c3aed]/25 text-[#6d28d9] rounded-xl h-10 hover:bg-[#f5f3ff]"
              >
                إلغاء
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent showCloseButton={false} className="max-w-2xl overflow-hidden rounded-2xl border border-[#7c3aed]/15 bg-white p-0 shadow-[0_24px_80px_rgba(124,58,237,0.12)] [&>button]:hidden" dir="rtl">
          <DialogTitle className="sr-only">{editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
          <DialogHeader className="px-6 py-5 border-b border-[#7c3aed]/15 bg-gradient-to-r from-[#f5f3ff] to-transparent">
            <DialogTitle className="flex w-full justify-start pr-2 text-right text-lg font-bold text-[#1a2332]">
              <span>{editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1a2332]">نص السؤال</Label>
                <Input
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="h-10 rounded-xl border-[#7c3aed]/25 focus-visible:ring-[#7c3aed]/20 focus-visible:border-[#7c3aed] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1a2332]">الإجابة الصحيحة</Label>
                <Input
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="h-10 rounded-xl border-[#7c3aed]/25 focus-visible:ring-[#7c3aed]/20 focus-visible:border-[#7c3aed] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1a2332]">قيمة النقاط</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[200, 400, 600].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPointsValue(val)}
                      className={`h-10 rounded-xl border text-sm font-semibold transition-all ${
                        pointsValue === val 
                          ? 'border-[#7c3aed]/30 bg-[#f5f3ff] text-[#7c3aed]' 
                          : 'border-[#7c3aed]/15 bg-white text-slate-500 hover:bg-[#f5f3ff]'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-[#7c3aed]/15 flex gap-3">
              <Button 
                onClick={handleQuestionSubmit} 
                className="flex-1 h-10 rounded-lg bg-[#7c3aed] text-white font-medium transition-colors hover:bg-[#6d28d9]"
              >
                {editingQuestion ? "حفظ التعديلات" : "حفظ"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowQuestionDialog(false)}
                className="border-[#7c3aed]/25 text-[#6d28d9] rounded-xl h-10 hover:bg-[#f5f3ff]"
              >
                إلغاء
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false} className="max-w-md overflow-hidden rounded-2xl border border-[#7c3aed]/15 bg-white p-0 shadow-[0_24px_80px_rgba(124,58,237,0.12)]" dir="rtl">
          <DialogTitle className="sr-only">تأكيد الحذف</DialogTitle>
          <DialogHeader className="px-6 py-5 border-b border-[#7c3aed]/15 bg-gradient-to-r from-[#f5f3ff] to-transparent">
            <DialogTitle className="flex w-full justify-start pr-2 text-right text-lg font-bold text-[#1a2332]">
              <span className="inline-flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-[#7c3aed]" />
                <span>تأكيد الحذف</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-red-100 bg-red-50/70 px-4 py-4 text-sm leading-7 text-slate-700">
              {deleteItem?.type === "category"
                ? "سيتم حذف هذه الفئة وجميع الأسئلة المرتبطة بها نهائياً."
                : "سيتم حذف هذا السؤال بشكل دائم من قاعدة البيانات."}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-[#7c3aed]/15 flex gap-3">
            <Button 
              onClick={handleDelete} 
              className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              نعم، احذف
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              className="border-[#7c3aed]/25 text-[#6d28d9] rounded-xl h-10 hover:bg-[#f5f3ff]"
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}