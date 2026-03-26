"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuessStages } from "@/lib/guess-stages";
import { Button } from "@/components/ui/button";
import { SiteLoader } from "@/components/ui/site-loader";

export default function GuessImagesStages() {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getGuessStages()
      .then((data) => {
        setStages(data);
        setError(null);
      })
      .catch((err) => {
        setStages([]);
        setError(err instanceof Error ? err.message : "تعذر تحميل المراحل");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#faf8f5] via-[#f5ead8] to-[#faf8f5] p-8">
      <div className="max-w-5xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#1a2332]">مراحل لعبة خمن الصورة</h1>
        {loading ? (
          <div className="flex justify-center py-4"><SiteLoader /></div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-lg font-bold text-red-700">{error}</div>
        ) : stages.length === 0 ? (
          <div className="rounded-xl border border-[#ead7bf] bg-[#fffaf2] px-4 py-6 text-center text-lg font-bold text-[#1a2332]">لا توجد مراحل متاحة حاليًا</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {stages.map((stage) => (
              <Button
                key={stage.id}
                className="w-full bg-gradient-to-r from-[#d8a355] to-[#c89547] text-white text-xl py-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(216,163,85,0.28)] active:translate-y-[2px] active:scale-[0.98] active:shadow-[0_8px_22px_rgba(216,163,85,0.22)]"
                onClick={() => router.push(`/competitions/guess-images?stage=${stage.id}`)}
              >
                {stage.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
