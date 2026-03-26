"use client";

export const dynamic = "force-dynamic";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";
import { SiteLoader } from "@/components/ui/site-loader";
import { GameFinishOverlay } from "@/components/games/game-finish-overlay";
import { createClient } from "@/lib/supabase/client";

// قائمة الحروف الأساسية
const BASE_LETTERS = [
  "ص","ح","خ","م","د","ز","ع","و","هـ","ط",
  "ج","ض","ل","ك","ي","س","أ","ت","ش","ق",
  "ر","ن","غ","ف","ب"
];

const SUBTLE_HEX_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='156' viewBox='0 0 180 156'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.46' stroke-width='1.8'%3E%3Cpolygon points='45,4 83,26 83,70 45,92 7,70 7,26'/%3E%3Cpolygon points='135,4 173,26 173,70 135,92 97,70 97,26'/%3E%3Cpolygon points='90,64 128,86 128,130 90,152 52,130 52,86'/%3E%3C/g%3E%3C/svg%3E\")";

function shuffleLetters(letters: string[]) {
  const shuffled = [...letters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

type LetterHiveQuestion = {
  id: string;
  letter: string;
  question: string;
  answer: string;
};

type LetterHiveProgress = {
  id: string | null;
  lastQuestionIndex: number;
};

type SessionResponse = {
  user?: {
    accountNumber?: string;
  } | null;
};

function getNeighbors(i: number): number[] {
  const row = Math.floor(i / 5), col = i % 5, neighbors: number[] = [];
  const checks: [number, number][] = row % 2 === 0 ?
    [[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]] :
    [[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];
  checks.forEach(([dr, dc]) => {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) neighbors.push(nr * 5 + nc);
  });
  return neighbors;
}

// مكون المحتوى الذي يستخدم useSearchParams
function GameContent() {
  const searchParams = useSearchParams();
  const team1 = searchParams?.get("team1") || "الأحمر";
  const team2 = searchParams?.get("team2") || "الأخضر";

  const [scoreRed, setScoreRed] = useState(0);
  const [scoreGreen, setScoreGreen] = useState(0);
  const [hexes, setHexes] = useState<(null | "red" | "green")[]>(Array(25).fill(null));
  const [randomLetters, setRandomLetters] = useState<string[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const [targetHex, setTargetHex] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [currentQuestionDebugIdx, setCurrentQuestionDebugIdx] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [questionsByLetter, setQuestionsByLetter] = useState<Record<string, LetterHiveQuestion[]>>({});
  const [progressByLetter, setProgressByLetter] = useState<Record<string, LetterHiveProgress>>({});
  const [boardLoading, setBoardLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState<number | null>(null);
  const [exhaustedLetter, setExhaustedLetter] = useState<string | null>(null);
  const [resettingLetter, setResettingLetter] = useState(false);
  const [boardScale, setBoardScale] = useState(1);
  const [boardOffset, setBoardOffset] = useState({ x: 0, y: 0 });
  const [isPanningBoard, setIsPanningBoard] = useState(false);

  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const boardPanStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const accountFromQuery = searchParams?.get("account") || "";

  useEffect(() => {
    setRandomLetters(shuffleLetters(BASE_LETTERS));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveAccountNumber = async () => {
      const normalizeAccount = (value?: string | null) => {
        const trimmed = String(value || "").trim();
        if (!trimmed || !/^\d+$/.test(trimmed)) {
          return null;
        }

        return Number(trimmed);
      };

      const fallbackAccount = normalizeAccount(
        accountFromQuery || localStorage.getItem("account_number") || localStorage.getItem("accountNumber")
      );

      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const data = (await response.json()) as SessionResponse;
        const sessionAccount = normalizeAccount(data?.user?.accountNumber);

        if (isMounted) {
          setAccountNumber(sessionAccount ?? fallbackAccount);
        }
      } catch {
        if (isMounted) {
          setAccountNumber(fallbackAccount);
        }
      }
    };

    void resolveAccountNumber();

    return () => {
      isMounted = false;
    };
  }, [accountFromQuery]);

  useEffect(() => {
    let isMounted = true;

    const preloadGameData = async () => {
      setBoardLoading(true);

      try {
        const supabase = createClient();
        const [{ data: questions, error: questionsError }, progressResult] = await Promise.all([
          supabase.from("letter_hive_questions").select("id,letter,question,answer").order("id", { ascending: true }),
          accountNumber === null
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from("letter_hive_progress")
                .select("id,letter,last_question_index")
                .eq("account_number", accountNumber),
        ]);

        const progressRows = progressResult.data;
        const progressError = progressResult.error;

        if (!isMounted) {
          return;
        }

        if (questionsError) {
          console.error("Error fetching letter hive questions:", questionsError);
          setQuestionsByLetter({});
        } else {
          const groupedQuestions = (questions || []).reduce<Record<string, LetterHiveQuestion[]>>((acc, row) => {
            if (!acc[row.letter]) {
              acc[row.letter] = [];
            }
            acc[row.letter].push(row);
            return acc;
          }, {});
          setQuestionsByLetter(groupedQuestions);
        }

        if (progressError) {
          console.error("Error fetching letter hive progress:", progressError);
          setProgressByLetter({});
        } else {
          const progressMap = (progressRows || []).reduce<Record<string, LetterHiveProgress>>((acc, row) => {
            acc[row.letter] = {
              id: row.id,
              lastQuestionIndex: row.last_question_index,
            };
            return acc;
          }, {});
          setProgressByLetter(progressMap);
        }
      } finally {
        if (isMounted) {
          setBoardLoading(false);
        }
      }
    };

    preloadGameData();

    return () => {
      isMounted = false;
    };
  }, [accountNumber]);

  const persistProgress = async (letter: string, nextIndex: number, progressId: string | null) => {
    if (accountNumber === null) {
      return;
    }

    try {
      const supabase = createClient();

      if (progressId) {
        const { error } = await supabase
          .from("letter_hive_progress")
          .update({ last_question_index: nextIndex, updated_at: new Date().toISOString() })
          .eq("id", progressId);

        if (error) {
          console.error("Error updating letter hive progress:", error);
        }

        return;
      }

      const { data, error } = await supabase
        .from("letter_hive_progress")
        .insert({ account_number: accountNumber, letter, last_question_index: nextIndex })
        .select("id")
        .single();

      if (error) {
        console.error("Error inserting letter hive progress:", error);
        return;
      }

      if (data?.id) {
        setProgressByLetter((prev) => ({
          ...prev,
          [letter]: {
            id: data.id,
            lastQuestionIndex: nextIndex,
          },
        }));
      }
    } catch (error) {
      console.error("Error persisting letter hive progress:", error);
    }
  };

  const resetLetterQuestions = async () => {
    if (!exhaustedLetter) {
      return;
    }

    const letter = exhaustedLetter;
    const questions = questionsByLetter[letter] || [];

    if (questions.length === 0) {
      setExhaustedLetter(null);
      setShowQuestionModal(false);
      return;
    }

    setResettingLetter(true);

    try {
      const progressEntry = progressByLetter[letter];

      if (accountNumber !== null && progressEntry?.id) {
        const supabase = createClient();
        const { error } = await supabase
          .from("letter_hive_progress")
          .delete()
          .eq("id", progressEntry.id);

        if (error) {
          console.error("Error resetting letter hive progress:", error);
        }
      }

      const firstQuestion = questions[0];

      setProgressByLetter((prev) => {
        const next = { ...prev };
        delete next[letter];
        return next;
      });
      setCurrentQuestion(firstQuestion.question);
      setCurrentAnswer(firstQuestion.answer);
      setCurrentQuestionIndex(firstQuestion.id || null);
      setCurrentQuestionDebugIdx(0);
      setShowAnswer(false);
      setExhaustedLetter(null);

      void persistProgress(letter, 0, null);
    } finally {
      setResettingLetter(false);
    }
  };

  const handleHexClick = async (i: number) => {
    if (hexes[i] || showWinModal || boardLoading || questionLoading) return;

    setTargetHex(i);
    setShowQuestionModal(true);
    setQuestionLoading(true);
    setShowAnswer(false);
    setCurrentAnswer(null);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(null);
    setCurrentQuestionDebugIdx(null);
    setExhaustedLetter(null);

    const letter = randomLetters[i];
    const questions = questionsByLetter[letter] || [];

    if (questions.length === 0) {
      setCurrentQuestion("لا يوجد سؤال لهذا الحرف بعد.");
      setCurrentAnswer(null);
      setCurrentQuestionIndex(null);
      setCurrentQuestionDebugIdx(null);
      setExhaustedLetter(null);
      setQuestionLoading(false);
      return;
    }

    const progressEntry = progressByLetter[letter];
    const nextIndex = progressEntry ? progressEntry.lastQuestionIndex + 1 : 0;

    if (nextIndex >= questions.length) {
      setCurrentQuestion("انتهت الأسئلة لهذا الحرف لهذا المستخدم.");
      setCurrentAnswer(null);
      setCurrentQuestionIndex(null);
      setCurrentQuestionDebugIdx(null);
      setExhaustedLetter(letter);
      setQuestionLoading(false);
      return;
    }

    const nextQuestion = questions[nextIndex];

    setCurrentQuestion(nextQuestion.question);
    setCurrentAnswer(nextQuestion.answer);
    setCurrentQuestionIndex(nextQuestion.id || null);
    setCurrentQuestionDebugIdx(nextIndex);
    setExhaustedLetter(null);
    setProgressByLetter((prev) => ({
      ...prev,
      [letter]: {
        id: progressEntry?.id || null,
        lastQuestionIndex: nextIndex,
      },
    }));
    setQuestionLoading(false);

    void persistProgress(letter, nextIndex, progressEntry?.id || null);
  };

  const handleShowAnswer = () => setShowAnswer(true);
  const handleAnswered = () => {
    setShowQuestionModal(false);
    setShowTeamModal(true);
  };

  const handleBoardWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const zoomStep = event.deltaY < 0 ? 0.16 : -0.16;

    setBoardScale((prevScale) => {
      const nextScale = Math.min(2.4, Math.max(1, Number((prevScale + zoomStep).toFixed(2))));

      if (nextScale === prevScale) {
        return prevScale;
      }

      if (nextScale === 1) {
        setBoardOffset({ x: 0, y: 0 });
      }

      return nextScale;
    });
  };

  const handleBoardMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 1 || boardScale <= 1) {
      return;
    }

    event.preventDefault();
    boardPanStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: boardOffset.x,
      offsetY: boardOffset.y,
    };
    setIsPanningBoard(true);
  };

  useEffect(() => {
    if (!isPanningBoard) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const start = boardPanStartRef.current;
      setBoardOffset({
        x: start.offsetX + (event.clientX - start.x),
        y: start.offsetY + (event.clientY - start.y),
      });
    };

    const handleMouseUp = () => {
      setIsPanningBoard(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanningBoard]);

  const assignColor = (color: "red" | "green") => {
    if (targetHex === null) return;
    const newHexes = [...hexes];
    newHexes[targetHex] = color;
    setHexes(newHexes);
    setShowTeamModal(false);
    setTargetHex(null);
    checkWinner(color, newHexes);
  };

  const checkWinner = (color: "red" | "green", hexArr: (null | "red" | "green")[]) => {
    const owned: number[] = hexArr.map((h, i) => h === color ? i : null).filter((i): i is number => i !== null);
    let startNodes: number[] = [], targets = new Set<number>();
    
    if (color === "red") {
      startNodes = owned.filter((i) => i % 5 === 0);
      owned.filter((i) => i % 5 === 4).forEach((i) => targets.add(i));
    } else {
      startNodes = owned.filter((i) => i < 5);
      owned.filter((i) => i >= 20).forEach((i) => targets.add(i));
    }

    let q = [...startNodes], visited = new Set<number>(startNodes);
    while (q.length > 0) {
      let curr = q.shift();
      if (curr !== undefined && targets.has(curr)) {
        showWin(color);
        return;
      }
      getNeighbors(curr!).forEach((n) => {
        if (owned.includes(n) && !visited.has(n)) {
          visited.add(n); q.push(n);
        }
      });
    }
  };

  const showWin = (color: "red" | "green") => {
    if (color === "red") {
      setScoreRed(s => s + 1);
      setWinMessage(`فاز الفريق ${team1}!`);
    } else {
      setScoreGreen(s => s + 1);
      setWinMessage(`فاز الفريق ${team2}!`);
    }
    setShowWinModal(true);
  };

  const resetGame = () => {
    setHexes(Array(25).fill(null));
    setRandomLetters(shuffleLetters(BASE_LETTERS));
    setShowWinModal(false);
  };

  const TeamScoreCard = ({ name, score, color, side }: { name: string, score: number, color: string, side: 'left' | 'right' }) => (
    <div style={{
      width: "156px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      padding: "28px 18px",
      background: "rgba(255, 255, 255, 0.94)",
      backdropFilter: "blur(10px)",
      borderRadius: side === 'left' ? "42px 14px 14px 42px" : "14px 42px 42px 14px",
      border: `2px solid ${color}`,
      boxShadow: `0 14px 30px -8px ${color}33`,
      position: "relative",
      zIndex: 3,
      transition: "all 0.3s ease"
    }}>
      <div style={{
        position: "absolute",
        top: "-15px",
        background: color,
        color: "white",
        padding: "4px 15px",
        borderRadius: "20px",
        fontSize: "0.9rem",
        fontWeight: "bold",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
      }}>
        {side === 'left' ? 'الفريق الثاني' : 'الفريق الأول'}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#444", marginTop: "10px" }}>{name}</div>
      <div style={{ 
        fontSize: "4.5rem", 
        fontWeight: "900", 
        color: color,
        lineHeight: "1",
        textShadow: "2px 2px 0px rgba(0,0,0,0.05)"
      }}>
        {score}
      </div>
      <div style={{ fontSize: "0.9rem", color: "#888", fontWeight: "bold" }}>نقطة</div>
    </div>
  );

  const renderHexGrid = () => {
    return hexes.map((status, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = col * 100 + (row % 2 === 0 ? 0 : 50);
      const y = row * 87;
      const isClaimed = status !== null;
      const fillColor = status === "red" ? "#df103a" : status === "green" ? "#10dfb5" : "#ffffff";
      const textColor = status === "red" ? "#ffffff" : status === "green" ? "#ffffff" : "#2c3e50";
      const borderColor = status === "red"
        ? "rgba(120, 14, 36, 0.95)"
        : status === "green"
          ? "rgba(5, 116, 94, 0.95)"
          : "rgba(77, 55, 125, 0.82)";
      const outerBorderColor = status === "red"
        ? "rgba(255, 205, 214, 0.42)"
        : status === "green"
          ? "rgba(209, 250, 229, 0.42)"
          : "rgba(124, 58, 237, 0.18)";
      const shadowFill = status === "red" ? "rgba(223,16,58,0.22)" : status === "green" ? "rgba(16,223,181,0.22)" : "rgba(44,62,80,0.08)";
      const glossFill = status ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.92)";

      return (
        <g key={i} transform={`translate(${x},${y})`} onClick={() => handleHexClick(i)} style={{ cursor: status ? "default" : "pointer" }}>
          <polygon
            points="50,7 103,36 103,90 50,120 -3,90 -3,36"
            fill={shadowFill}
          />
          <polygon
            points="50,0 100,29 100,87 50,116 0,87 0,29"
            fill={fillColor}
            stroke={outerBorderColor}
            strokeWidth={6}
          />
          <polygon
            points="50,0 100,29 100,87 50,116 0,87 0,29"
            fill={fillColor}
            stroke={borderColor}
            strokeWidth={2.4}
              style={{ transition: "fill 0.3s ease" }}
          />
          {!isClaimed ? (
            <polygon
              points="50,10 89,33 89,79 50,102 11,79 11,33"
              fill={glossFill}
              style={{ mixBlendMode: "normal", pointerEvents: "none" }}
            />
          ) : null}
          {!isClaimed ? (
            <polygon
              points="50,16 80,33 80,42 50,59 20,42 20,33"
              fill="rgba(255,255,255,0.24)"
              style={{ pointerEvents: "none" }}
            />
          ) : null}
          <polygon
            points="50,5 95,31 95,85 50,111 5,85 5,31"
            fill="none"
            stroke={status ? "rgba(255,255,255,0.12)" : "rgba(124,58,237,0.14)"}
            strokeWidth={1.35}
          />
          {!isClaimed ? (
            <text
              x="50"
              y="58"
              style={{
                fontSize: 38,
                fontWeight: "bold",
                fill: textColor,
                pointerEvents: "none",
                dominantBaseline: "middle",
                textAnchor: "middle",
                fontFamily: "Arial"
              }}
            >
              {randomLetters[i]}
            </text>
          ) : null}
        </g>
      );
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fff9f3 0%, #fff2e8 32%, #f7fbfa 68%, #f7f7ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 20%, rgba(223,16,58,0.16) 0%, rgba(223,16,58,0.06) 18%, rgba(223,16,58,0) 42%), radial-gradient(circle at 82% 76%, rgba(16,223,181,0.18) 0%, rgba(16,223,181,0.06) 20%, rgba(16,223,181,0) 44%), radial-gradient(circle at 50% 50%, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0.02) 22%, rgba(124,58,237,0) 52%)" }} />
        <div style={{ position: "absolute", top: "-180px", right: "-90px", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(circle, rgba(223,16,58,0.22) 0%, rgba(223,16,58,0.08) 34%, rgba(223,16,58,0) 68%)", filter: "blur(8px)" }} />
        <div style={{ position: "absolute", bottom: "-210px", left: "-120px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,223,181,0.2) 0%, rgba(16,223,181,0.08) 36%, rgba(16,223,181,0) 70%)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", inset: "6% 5%", borderRadius: "48px", background: "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.26) 32%, rgba(255,255,255,0.12) 100%)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -1px 0 rgba(255,255,255,0.18)" }} />
        <div style={{ position: "absolute", inset: "9% 8%", borderRadius: "40px", background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 100%)", border: "1px solid rgba(255,255,255,0.22)" }} />
        <div style={{ position: "absolute", top: "11%", left: "7%", width: "230px", height: "230px", transform: "rotate(-10deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(223,16,58,0.12) 0%, rgba(223,16,58,0.02) 100%)", border: "1px solid rgba(223,16,58,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }} />
        <div style={{ position: "absolute", top: "9%", right: "10%", width: "170px", height: "170px", transform: "rotate(8deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(223,16,58,0.08) 0%, rgba(223,16,58,0.012) 100%)", border: "1px solid rgba(223,16,58,0.1)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: "12%", left: "9%", width: "185px", height: "185px", transform: "rotate(-8deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(16,223,181,0.09) 0%, rgba(16,223,181,0.014) 100%)", border: "1px solid rgba(16,223,181,0.1)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "8%", width: "270px", height: "270px", transform: "rotate(10deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(16,223,181,0.13) 0%, rgba(16,223,181,0.02) 100%)", border: "1px solid rgba(16,223,181,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: SUBTLE_HEX_PATTERN, backgroundSize: "180px 156px", backgroundPosition: "center center", maskImage: "radial-gradient(circle at center, black 38%, transparent 88%)", opacity: 0.72 }} />
      </div>
      
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: "absolute", top: "20px", right: "20px", zIndex: 50 }}
      >
        <div style={{
          width: "24px", height: "24px", background: "#ecfdf3", border: "2px solid #86efac", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#15803d",
          cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", transition: "transform 0.2s ease"
        }}>
          {"!"}
        </div>
        {isHovered && (
          <div style={{
            position: "absolute", top: "30px", right: "0", whiteSpace: "nowrap", background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(5px)", padding: "8px 15px", borderRadius: "12px", border: "1px solid #86efac",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)", fontSize: "0.85rem", color: "#555", fontWeight: "bold"
          }}>
            اضغط على زر <span style={{ color: "#15803d" }}>F11</span> لملء الشاشة
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "980px" }}>
        <div style={{ flex: "1", position: "relative", display: "flex", justifyContent: "center", zIndex: 2 }}>
          <div
            ref={boardViewportRef}
            onWheel={handleBoardWheel}
            onMouseDown={handleBoardMouseDown}
            style={{
              width: "100%",
              maxWidth: "650px",
              filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.1))",
              position: "relative",
              overflow: "visible",
              userSelect: "none",
              cursor: boardScale > 1 ? (isPanningBoard ? "grabbing" : "grab") : "default"
            }}
          >
            <div
              style={{
                position: "relative",
                transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})`,
                transformOrigin: "center center",
                transition: isPanningBoard ? "none" : "transform 0.18s ease-out",
                willChange: "transform"
              }}
            >
            <div style={{ position: "absolute", left: "0", top: "50%", transform: "translate(-98%, -50%)", zIndex: 4 }}>
              <TeamScoreCard name={team2} score={scoreGreen} color="#10dfb5" side="left" />
            </div>
            <div style={{ position: "absolute", right: "0", top: "50%", transform: "translate(98%, -50%)", zIndex: 4 }}>
              <TeamScoreCard name={team1} score={scoreRed} color="#df103a" side="right" />
            </div>
            <svg viewBox="-70 -70 690 605" style={{ width: "100%", height: "auto", overflow: "visible" }}>
              <foreignObject x="-80" y="-80" width="710" height="624">
                <div style={{
                  width: '100%', height: '100%', borderRadius: '30px',
                  background: `
                    linear-gradient(125deg, rgba(255,255,255,0.18) 8%, rgba(255,255,255,0.05) 18%, rgba(255,255,255,0) 30%),
                    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0) 58%),
                    linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.07) 100%),
                    conic-gradient(from -45deg, #10dfb5 90deg, #df103a 90deg 180deg, #10dfb5 180deg 270deg, #df103a 270deg)
                  `,
                  boxShadow: 'inset 0 0 0 5px rgba(0,0,0,0.05), inset 0 20px 40px rgba(255,255,255,0.1), inset 0 -24px 40px rgba(0,0,0,0.08)'
                }} />
              </foreignObject>
              <line x1="-50" y1="232" x2="600" y2="232" stroke="rgba(0,0,0,0.1)" strokeWidth="2" strokeDasharray="10,10" />
              {renderHexGrid()}
            </svg>
            </div>
          </div>
          {boardLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.01)",
                borderRadius: "24px",
                pointerEvents: "auto",
              }}
            />
          )}
        </div>
      </div>

      {showQuestionModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110
          }}
          onClick={() => setShowQuestionModal(false)}
        >
          <div
            style={{
              background: "white", padding: "40px 30px", borderRadius: "25px", textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320
            }}
            onClick={e => e.stopPropagation()}
          >
            {questionLoading ? (
              <div style={{ minWidth: 280, minHeight: 80 }} />
            ) : (
              <>
                <h3 style={{ marginBottom: 24, fontSize: "1.3rem", color: "#2c3e50" }}>{currentQuestion}</h3>
            {exhaustedLetter && !currentAnswer && (
              <button
                onClick={() => {
                  void resetLetterQuestions();
                }}
                style={{
                  padding: "14px 32px",
                  background: resettingLetter ? "#a78bfa" : "#7c3aed",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  cursor: resettingLetter ? "wait" : "pointer",
                  fontWeight: "bold",
                  fontSize: "1.05rem",
                  marginBottom: 16,
                }}
              >
                {resettingLetter ? "جارٍ إعادة الأسئلة..." : "إعادة الأسئلة"}
              </button>
            )}
            {!showAnswer && currentAnswer && (
              <button onClick={handleShowAnswer} style={{ padding: "14px 40px", background: "#2c3e50", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", marginBottom: 16, marginTop: 32 }}>الإجابة</button>
            )}
            {showAnswer && currentAnswer && (
              <>
                <div style={{ fontSize: "1.5rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{currentAnswer}</div>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: 32 }}>
                  <button onClick={() => { setShowQuestionModal(false); setShowTeamModal(true); assignColor("red"); }} style={{ padding: "14px 40px", background: "#df103a", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem" }}>{team1}</button>
                  <button onClick={() => { setShowQuestionModal(false); setShowTeamModal(true); assignColor("green"); }} style={{ padding: "14px 40px", background: "#10dfb5", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem" }}>{team2}</button>
                </div>
              </>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {showTeamModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100
          }}
          onClick={() => setShowTeamModal(false)}
        >
          <div
            style={{
              background: "white", padding: "40px", borderRadius: "25px", textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "25px", fontSize: "1.5rem", color: "#333" }}>اختر الفريق صاحب الإجابة:</h3>
            <div style={{ display: "flex", gap: "20px", flexDirection: 'row-reverse', justifyContent: 'center' }}>
              <button onClick={() => assignColor("green")} style={{ padding: "15px 40px", background: "#10dfb5", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>{team2}</button>
              <button onClick={() => assignColor("red")} style={{ padding: "15px 40px", background: "#df103a", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>{team1}</button>
            </div>
          </div>
        </div>
      )}

      {showWinModal && (
        <GameFinishOverlay
          title="انتهت الجولة!"
          subtitle={winMessage}
          maxWidthClassName="max-w-xl"
          actions={[
            {
              label: "لعب مرة أخرى",
              onClick: resetGame,
            },
            {
              label: "العودة للرئيسية",
              onClick: () => {
                window.location.href = "/competitions";
              },
              tone: "outline",
            },
          ]}
        />
      )}
    </div>
  );
}

// التصدير الأساسي مغلف بـ Suspense
export default function LetterHiveGame() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SiteLoader size="lg" /></div>}>
      <GameContent />
    </Suspense>
  );
}
