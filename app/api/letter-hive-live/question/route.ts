import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import { normalizeBoardLetters, type LetterHiveLiveMatchRow, resolveMatchRole, sanitizeMatchForClient, sanitizeTeamName } from "@/lib/letter-hive-live"
import { createAdminClient } from "@/lib/supabase/admin"

async function findMatchByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("letter_hive_live_matches")
    .select("*")
    .eq("presenter_token", token)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as LetterHiveLiveMatchRow | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = sanitizeTeamName(searchParams.get("token"))

    if (!token) {
      return NextResponse.json({ error: "رابط المقدم مطلوب" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    if (role !== "presenter") {
      return NextResponse.json({ error: "هذا الرابط ليس رابط مقدم" }, { status: 403 })
    }

    const supabase = createAdminClient()
    const [{ data: usedRows, error: usedError }, { data: questionRows, error: questionError }] = await Promise.all([
      supabase.from("letter_hive_live_used_questions").select("question_id").eq("match_id", match.id),
      supabase
        .from("letter_hive_live_questions")
        .select("id, letter, question, answer")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ])

    if (usedError) {
      throw usedError
    }

    if (questionError) {
      throw questionError
    }

    const usedQuestionIds = new Set((usedRows || []).map((row) => row.question_id))
    const remainingQuestions = (questionRows || []).filter((row) => !usedQuestionIds.has(row.id))

    const grouped = remainingQuestions.reduce<Record<string, Array<{ id: string; question: string; answer: string }>>>((acc, row) => {
      if (!acc[row.letter]) {
        acc[row.letter] = []
      }

      acc[row.letter].push({
        id: row.id,
        question: row.question,
        answer: row.answer,
      })

      return acc
    }, {})

    return NextResponse.json({
      questionsByLetter: grouped,
    })
  } catch (error) {
    console.error("Error preloading live letter hive questions:", error)
    return NextResponse.json({ error: "تعذر تحميل أسئلة البطولة" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = sanitizeTeamName(body?.token)
    const cellIndex = Number(body?.cellIndex)
    const requestedQuestionId = sanitizeTeamName(body?.questionId)

    if (!token) {
      return NextResponse.json({ error: "رابط المقدم مطلوب" }, { status: 400 })
    }

    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 24) {
      return NextResponse.json({ error: "رقم الخلية غير صالح" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    if (role !== "presenter") {
      return NextResponse.json({ error: "هذا الرابط ليس رابط مقدم" }, { status: 403 })
    }

    if (!match.is_open || match.status === "waiting") {
      return NextResponse.json({ error: "ابدأ اللعبة أولاً" }, { status: 409 })
    }

    if (match.status === "finished") {
      return NextResponse.json({ error: "المباراة انتهت" }, { status: 409 })
    }

    const boardLetters = normalizeBoardLetters(match.board_letters)
    const claimedCells = Array.isArray(match.claimed_cells) ? match.claimed_cells : []
    const selectedLetter = boardLetters[cellIndex]

    if (!selectedLetter) {
      return NextResponse.json({ error: "تعذر تحديد حرف الخلية" }, { status: 400 })
    }

    if (claimedCells[cellIndex] === "team_a" || claimedCells[cellIndex] === "team_b") {
      return NextResponse.json({ error: "هذه الخلية محجوزة بالفعل" }, { status: 409 })
    }

    const supabase = createAdminClient()

    const [{ data: usedRows, error: usedError }, { data: questionRows, error: questionError }] = await Promise.all([
      supabase
        .from("letter_hive_live_used_questions")
        .select("question_id")
        .eq("match_id", match.id)
        .eq("letter", selectedLetter),
      supabase
        .from("letter_hive_live_questions")
        .select("id, question, answer")
        .eq("letter", selectedLetter)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ])

    if (usedError) {
      throw usedError
    }

    if (questionError) {
      throw questionError
    }

    const usedQuestionIds = new Set((usedRows || []).map((row) => row.question_id))
    const remainingQuestions = (questionRows || []).filter((row) => !usedQuestionIds.has(row.id))
    const nextQuestion = requestedQuestionId
      ? remainingQuestions.find((row) => row.id === requestedQuestionId)
      : remainingQuestions[0]

    if (!nextQuestion) {
      const { data: updatedMatch, error: updateError } = await supabase
        .from("letter_hive_live_matches")
        .update({
          current_prompt: "ما فيه أسئلة لهذا الحرف في البطولة حالياً. أضف أسئلة لاحقاً ثم أعد المحاولة.",
          current_answer: null,
          current_letter: selectedLetter,
          current_cell_index: cellIndex,
          show_answer: false,
          buzz_enabled: false,
          first_buzz_side: null,
          first_buzzed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .select("*")
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        match: sanitizeMatchForClient(updatedMatch as LetterHiveLiveMatchRow, "presenter", new URL(request.url).origin),
      })
    }

    const { error: insertUsedError } = await supabase
      .from("letter_hive_live_used_questions")
      .insert({
        match_id: match.id,
        question_id: nextQuestion.id,
        letter: selectedLetter,
      })

    if (insertUsedError) {
      throw insertUsedError
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from("letter_hive_live_matches")
      .update({
        current_prompt: nextQuestion.question,
        current_answer: nextQuestion.answer,
        current_letter: selectedLetter,
        current_cell_index: cellIndex,
        show_answer: false,
        buzz_enabled: true,
        first_buzz_side: null,
        first_buzzed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      match: sanitizeMatchForClient(updatedMatch as LetterHiveLiveMatchRow, "presenter", new URL(request.url).origin),
    })
  } catch (error) {
    console.error("Error selecting live letter hive question:", error)
    return NextResponse.json({ error: "تعذر تحميل سؤال البطولة" }, { status: 500 })
  }
}