import { createClient } from "@/lib/supabase/client";

export async function getRandomQuestionWithAnswer(letter: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("letter_hive_live_questions")
    .select("question,answer")
    .eq("is_active", true)
    .eq("letter", letter);
  if (error || !data || data.length === 0) return null;
  const idx = Math.floor(Math.random() * data.length);
  return data[idx];
}
