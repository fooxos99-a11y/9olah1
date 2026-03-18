"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { SiteLoader } from "@/components/ui/site-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Medal, Gem, Trash2, Plus, User, Trophy, Star, Flame, Zap, Crown, Heart } from "lucide-react";

interface Student {
  id: string;
  name: string;
  circle_name?: string;
}

interface Circle {
  id: string;
  name: string;
  studentCount: number;
}

interface Achievement {
  id: string;
  title: string;
  icon_type: string;
  date: string;
}

function StudentsAchievementsAdmin() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [icon, setIcon] = useState<string>("trophy");
  const [achievementName, setAchievementName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [achievementsMap, setAchievementsMap] = useState<Record<string, Achievement[]>>({});
  const [isCirclesLoading, setIsCirclesLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  useEffect(() => {
    const fetchCircles = async () => {
      try {
        const response = await fetch("/api/circles");
        const data = await response.json();
        setCircles(data.circles || []);
      } catch (error) {
        console.error("Error fetching circles:", error);
        setCircles([]);
      } finally {
        setIsCirclesLoading(false);
      }
    };

    fetchCircles();
  }, []);

  const fetchAchievementsForStudents = async (studentsList: Student[]) => {
    if (studentsList.length === 0) {
      setAchievementsMap({});
      return;
    }

    const achievementsEntries = await Promise.all(
      studentsList.map(async (student) => {
        try {
          const response = await fetch(`/api/achievements?student_id=${student.id}`);
          const achData = await response.json();
          return [student.id, achData.achievements || []] as const;
        } catch (error) {
          console.error(`Error fetching achievements for student ${student.id}:`, error);
          return [student.id, []] as const;
        }
      }),
    );

    setAchievementsMap(Object.fromEntries(achievementsEntries));
  };

  const fetchStudentsByCircle = async (circleName: string) => {
    setIsStudentsLoading(true);
    setSelectedStudent(null);
    setStudents([]);
    setAchievementsMap({});

    try {
      const response = await fetch(`/api/students?circle=${encodeURIComponent(circleName)}`);
      const data = await response.json();
      const studentsList = data.students || [];

      setStudents(studentsList);
      await fetchAchievementsForStudents(studentsList);
    } catch (error) {
      console.error("Error fetching students by circle:", error);
      setStudents([]);
      setAchievementsMap({});
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const handleCircleChange = async (circleName: string) => {
    setSelectedCircle(circleName);

    if (!circleName) {
      setSelectedStudent(null);
      setStudents([]);
      setAchievementsMap({});
      return;
    }

    await fetchStudentsByCircle(circleName);
  };

  const handleSave = async () => {
    if (!selectedStudent || !achievementName) return;

    setIsSaving(true);
    await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: selectedStudent.name,
        student_id: selectedStudent.id,
        icon_type: icon,
        title: achievementName,
        achievement_type: "student",
        date: new Date().toLocaleDateString("ar-EG"),
        description: "تم إضافة إنجاز جديد للطالب.",
        category: "عام",
        status: "مكتمل",
        level: "ممتاز",
      }),
    });

    const response = await fetch(`/api/achievements?student_id=${selectedStudent.id}`);
    const achData = await response.json();

    setAchievementsMap((prev) => ({ ...prev, [selectedStudent.id]: achData.achievements || [] }));
    setIsSaving(false);
    setSelectedStudent(null);
    setAchievementName("");
    setIcon("trophy");
  };

  const handleDelete = async (achievementId: string, studentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإنجاز؟")) return;

    await fetch(`/api/achievements?id=${achievementId}`, { method: "DELETE" });
    const response = await fetch(`/api/achievements?student_id=${studentId}`);
    const achData = await response.json();
    setAchievementsMap((prev) => ({ ...prev, [studentId]: achData.achievements || [] }));
  };

  const renderIcon = (type: string, cls = "w-4 h-4") => {
    const color = "text-[#D4AF37]";

    switch (type) {
      case "medal":
        return <Medal className={`${cls} ${color}`} />;
      case "gem":
        return <Gem className={`${cls} ${color}`} />;
      case "star":
        return <Star className={`${cls} ${color}`} />;
      case "flame":
        return <Flame className={`${cls} ${color}`} />;
      case "zap":
        return <Zap className={`${cls} ${color}`} />;
      case "crown":
        return <Crown className={`${cls} ${color}`} />;
      case "heart":
        return <Heart className={`${cls} ${color}`} />;
      default:
        return <Award className={`${cls} ${color}`} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]" dir="rtl">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1a2332]">
                  {selectedStudent ? `إضافة إنجاز — ${selectedStudent.name}` : "إنجازات الطلاب"}
                </h1>
                <p className="text-sm text-neutral-400 mt-0.5">
                  {selectedStudent ? "اختر رمزاً وأدخل عنوان الإنجاز" : "تحكم في أوسمة وإنجازات الطلاب"}
                </p>
              </div>
            </div>
          </div>

          {!selectedStudent ? (
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#D4AF37]/40 flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">قائمة الطلاب</h2>
                <div className="mr-auto min-w-[220px] max-w-[340px] w-full sm:w-auto sm:flex-1">
                  {isCirclesLoading ? (
                    <div className="flex items-center justify-end py-1">
                      <SiteLoader size="sm" />
                    </div>
                  ) : circles.length === 0 ? (
                    <span className="text-sm text-neutral-400">لا توجد حلقات متاحة</span>
                  ) : (
                    <Select dir="rtl" value={selectedCircle} onValueChange={handleCircleChange}>
                      <SelectTrigger className="h-11 w-full rounded-xl border-[#D4AF37]/35 bg-white px-4 text-right text-sm text-[#1a2332] shadow-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] [&>span]:w-full [&>span]:text-right [&>svg]:shrink-0 [&>svg]:text-[#C9A961]">
                        <SelectValue placeholder="اختر الحلقة" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#D4AF37]/25 bg-white text-right">
                        {circles.map((circle) => (
                          <SelectItem
                            key={circle.id}
                            value={circle.name}
                            className="justify-end pr-10 pl-3 text-right text-sm text-[#1a2332] focus:bg-[#D4AF37]/10 focus:text-[#1a2332]"
                          >
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[#D4AF37]/15">
                {!selectedCircle ? (
                  <div className="py-16 text-center text-neutral-400 text-sm">اختر حلقة لعرض الطلاب</div>
                ) : isStudentsLoading ? (
                  <div className="py-12 flex items-center justify-center">
                    <SiteLoader size="md" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400 text-sm">لا يوجد طلاب في هذه الحلقة</div>
                ) : (
                  students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#D4AF37]/5 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#D4AF37]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1a2332]">{student.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {achievementsMap[student.id]?.length > 0 ? (
                              achievementsMap[student.id].map((achievement) => (
                                <div key={achievement.id} className="group/item flex items-center gap-1 bg-[#D4AF37]/8 border border-[#D4AF37]/25 px-2.5 py-0.5 rounded-full">
                                  {renderIcon(achievement.icon_type)}
                                  <span className="text-xs text-neutral-700">{achievement.title}</span>
                                  <button
                                    onClick={() => handleDelete(achievement.id, student.id)}
                                    className="mr-0.5 opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-neutral-400 italic">لا توجد إنجازات</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="flex items-center gap-1.5 text-sm h-9 px-4 rounded-lg border border-[#D4AF37]/50 text-[#C9A961] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all font-medium shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden max-w-lg mx-auto">
              <div className="px-6 py-5 border-b border-[#D4AF37]/40">
                <h2 className="text-base font-bold text-[#1a2332]">إنجاز جديد</h2>
                <p className="text-sm text-neutral-400 mt-0.5">
                  للطالب: <span className="text-[#C9A961] font-semibold">{selectedStudent.name}</span>
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-3">اختر الرمز</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { type: "trophy", label: "كأس", Icon: Trophy },
                      { type: "medal", label: "ميدالية", Icon: Medal },
                      { type: "gem", label: "جوهرة", Icon: Gem },
                      { type: "star", label: "نجمة", Icon: Star },
                      { type: "flame", label: "شعلة", Icon: Flame },
                      { type: "zap", label: "برق", Icon: Zap },
                      { type: "crown", label: "تاج", Icon: Crown },
                      { type: "heart", label: "قلب", Icon: Heart },
                    ].map(({ type, label, Icon }) => (
                      <button
                        key={type}
                        onClick={() => setIcon(type)}
                        className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                          icon === type
                            ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#C9A961]"
                            : "border-neutral-100 bg-neutral-50 text-neutral-400 hover:border-[#D4AF37]/40"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">عنوان الإنجاز</p>
                  <input
                    className="w-full border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all text-[#1a2332] bg-[#fafaf9]"
                    placeholder="مثال: حفظ جزء عم"
                    value={achievementName}
                    onChange={(e) => setAchievementName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStudent(null)}
                    className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !achievementName}
                    className="border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm h-9 rounded-lg font-medium"
                  >
                    {isSaving ? "جاري الحفظ..." : "حفظ الإنجاز"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default StudentsAchievementsAdmin;
