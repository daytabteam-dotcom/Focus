import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListRegulationExercises, useLogRegulationExercise } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Wind, ArrowLeft, Play, CheckCircle, Loader2 } from "lucide-react";
import { getGetDopaminePointsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_COLORS: Record<string, string> = {
  physiological_sigh: "from-sky-50 to-blue-100 dark:from-sky-950/40 dark:to-blue-900/30 border-sky-200 dark:border-sky-800",
  box_breathing: "from-violet-50 to-purple-100 dark:from-violet-950/40 dark:to-purple-900/30 border-violet-200 dark:border-violet-800",
  jaw_release: "from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-900/30 border-amber-200 dark:border-amber-800",
  cold_water: "from-cyan-50 to-teal-100 dark:from-cyan-950/40 dark:to-teal-900/30 border-cyan-200 dark:border-cyan-800",
  humming: "from-rose-50 to-pink-100 dark:from-rose-950/40 dark:to-pink-900/30 border-rose-200 dark:border-rose-800",
};

const TYPE_CIRCLE_COLORS: Record<string, string> = {
  physiological_sigh: "bg-sky-400",
  box_breathing: "bg-violet-400",
  jaw_release: "bg-amber-400",
  cold_water: "bg-cyan-400",
  humming: "bg-rose-400",
};

// ─── Box Breathing: dot travels around a square ─────────────────────────────
function BoxBreathingAnimation({
  breathPhase,
  isAnimating,
}: {
  breathPhase: string;
  isAnimating: boolean;
}) {
  const S = 160;
  const P = 24;
  // dot corners: bottom-left → top-left → top-right → bottom-right → bottom-left
  const corners: Record<string, { x: number; y: number }> = {
    inhale: { x: P, y: P },           // heading to top-left
    hold: { x: S - P, y: P },         // heading to top-right
    exhale: { x: S - P, y: S - P },   // heading to bottom-right
    hold2: { x: P, y: S - P },        // heading to bottom-left
  };
  const dotPos = isAnimating ? (corners[breathPhase] ?? { x: P, y: S - P }) : { x: P, y: S - P };

  const sideLabels: Record<string, string> = {
    inhale: "Inhale",
    hold: "Hold",
    exhale: "Exhale",
    hold2: "Hold",
  };

  // Which side is active
  const sideActive = isAnimating ? breathPhase : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
        {/* Square sides */}
        {/* Left */}
        <line x1={P} y1={P} x2={P} y2={S - P} strokeWidth="3" strokeLinecap="round"
          stroke={sideActive === "hold2" ? "#a78bfa" : "#c4b5fd50"} />
        {/* Top */}
        <line x1={P} y1={P} x2={S - P} y2={P} strokeWidth="3" strokeLinecap="round"
          stroke={sideActive === "hold" ? "#a78bfa" : "#c4b5fd50"} />
        {/* Right */}
        <line x1={S - P} y1={P} x2={S - P} y2={S - P} strokeWidth="3" strokeLinecap="round"
          stroke={sideActive === "exhale" ? "#a78bfa" : "#c4b5fd50"} />
        {/* Bottom */}
        <line x1={P} y1={S - P} x2={S - P} y2={S - P} strokeWidth="3" strokeLinecap="round"
          stroke={sideActive === "inhale" ? "#a78bfa" : "#c4b5fd50"} />

        {/* Corner dots */}
        {[{ x: P, y: P }, { x: S - P, y: P }, { x: S - P, y: S - P }, { x: P, y: S - P }].map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill="#c4b5fd80" />
        ))}

        {/* Traveling dot */}
        <motion.circle
          r={7}
          fill="#7c3aed"
          filter="drop-shadow(0 0 6px #7c3aed88)"
          animate={{ cx: dotPos.x, cy: dotPos.y }}
          transition={{ duration: 4, ease: "easeInOut" }}
        />

        {/* Phase labels on sides */}
        <text x={S / 2} y={P - 6} textAnchor="middle" fontSize="9" fill="#7c3aed99">Hold</text>
        <text x={S / 2} y={S - P + 14} textAnchor="middle" fontSize="9" fill="#7c3aed99">Inhale</text>
        <text x={P - 3} y={S / 2} textAnchor="end" fontSize="9" fill="#7c3aed99">Hold</text>
        <text x={S - P + 3} y={S / 2} textAnchor="start" fontSize="9" fill="#7c3aed99">Exhale</text>
      </svg>
      <div className="text-violet-600 dark:text-violet-400 font-semibold text-lg h-7">
        {isAnimating ? sideLabels[breathPhase] : "Ready"}
      </div>
    </div>
  );
}

// ─── Jaw Release: shoulders drooping + jaw dropping ──────────────────────────
function JawReleaseAnimation({ isAnimating }: { isAnimating: boolean }) {
  const shoulderY = isAnimating ? 14 : 0;
  const jawOpen = isAnimating ? 14 : 4;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Head */}
        <ellipse cx="80" cy="52" rx="22" ry="24" fill="none" stroke="#f59e0b" strokeWidth="2.5" />

        {/* Neck */}
        <line x1="72" y1="74" x2="72" y2="88" stroke="#f59e0b" strokeWidth="2" />
        <line x1="88" y1="74" x2="88" y2="88" stroke="#f59e0b" strokeWidth="2" />

        {/* Torso */}
        <line x1="72" y1="88" x2="88" y2="88" stroke="#f59e0b" strokeWidth="2" />
        <line x1="80" y1="88" x2="80" y2="120" stroke="#f59e0b" strokeWidth="2.5" />

        {/* Left shoulder — droops down */}
        <motion.line
          x1="80" y1="88"
          x2="44" y2="96"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ y2: 96 + shoulderY, x2: 42 }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
        />
        {/* Right shoulder — droops down */}
        <motion.line
          x1="80" y1="88"
          x2="116" y2="96"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ y2: 96 + shoulderY, x2: 118 }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
        />

        {/* Eyes (closed when relaxing) */}
        <motion.line x1="70" y1="50" x2="76" y2="50" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"
          animate={{ y1: isAnimating ? 51 : 50, y2: isAnimating ? 51 : 50 }}
          transition={{ duration: 2 }}
        />
        <motion.line x1="84" y1="50" x2="90" y2="50" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"
          animate={{ y1: isAnimating ? 51 : 50, y2: isAnimating ? 51 : 50 }}
          transition={{ duration: 2 }}
        />

        {/* Jaw — drops open */}
        <motion.path
          d="M 65 64 Q 80 68 95 64"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ d: isAnimating ? `M 65 64 Q 80 ${68 + jawOpen} 95 64` : "M 65 64 Q 80 68 95 64" }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
        />

        {/* Tension squiggles that fade out */}
        {isAnimating && (
          <>
            <motion.text x="30" y="80" fontSize="14" fill="#fbbf24"
              initial={{ opacity: 1, y: 80 }}
              animate={{ opacity: 0, y: 60 }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}>~</motion.text>
            <motion.text x="120" y="80" fontSize="14" fill="#fbbf24"
              initial={{ opacity: 1, y: 80 }}
              animate={{ opacity: 0, y: 60 }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}>~</motion.text>
            <motion.text x="78" y="145" fontSize="12" fill="#fbbf2460"
              initial={{ opacity: 0.6, y: 145 }}
              animate={{ opacity: 0, y: 130 }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.4 }}>let go</motion.text>
          </>
        )}
      </svg>
      <div className="text-amber-600 dark:text-amber-400 font-semibold text-lg h-7">
        {isAnimating ? "Release the tension" : "Ready"}
      </div>
    </div>
  );
}

// ─── Cold Water: expanding ripple rings ──────────────────────────────────────
function ColdWaterAnimation({ isAnimating }: { isAnimating: boolean }) {
  const rings = [0, 1, 2, 3];

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Static center droplet */}
        <ellipse cx="80" cy="72" rx="10" ry="13" fill="#22d3ee" opacity="0.8" />
        <ellipse cx="80" cy="62" rx="4" ry="3" fill="#22d3ee" opacity="0.5" />
        {/* Drip tip */}
        <path d="M 80 84 Q 80 90 80 90" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />

        {/* Ripple rings */}
        {isAnimating && rings.map((i) => (
          <motion.ellipse
            key={i}
            cx="80"
            cy="108"
            rx={10}
            ry={4}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.5"
            initial={{ rx: 10, ry: 4, opacity: 0.8 }}
            animate={{ rx: 52, ry: 14, opacity: 0 }}
            transition={{
              duration: 2.4,
              ease: "easeOut",
              repeat: Infinity,
              delay: i * 0.6,
            }}
          />
        ))}

        {/* Static water line */}
        <ellipse cx="80" cy="108" rx="52" ry="8" fill="#cffafe" opacity="0.25" />
        <ellipse cx="80" cy="108" rx="40" ry="5" fill="#a5f3fc" opacity="0.2" />

        {/* Splash droplets */}
        {isAnimating && [
          { angle: -40, dist: 28 },
          { angle: 40, dist: 28 },
          { angle: -20, dist: 20 },
          { angle: 20, dist: 20 },
        ].map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.sin(rad) * s.dist;
          const ty = -Math.abs(Math.cos(rad)) * s.dist * 0.6;
          return (
            <motion.circle
              key={i}
              cx={80}
              cy={108}
              r={2.5}
              fill="#22d3ee"
              initial={{ cx: 80, cy: 108, opacity: 1 }}
              animate={{ cx: 80 + tx, cy: 108 + ty, opacity: 0 }}
              transition={{
                duration: 0.9,
                ease: "easeOut",
                repeat: Infinity,
                delay: i * 0.15 + 0.1,
                repeatDelay: 2.4 - 0.9,
              }}
            />
          );
        })}
      </svg>
      <div className="text-cyan-600 dark:text-cyan-400 font-semibold text-lg h-7">
        {isAnimating ? "Feel the reset" : "Ready"}
      </div>
    </div>
  );
}

// ─── Humming: oscillating frequency bars ─────────────────────────────────────
function HummingAnimation({ isAnimating }: { isAnimating: boolean }) {
  const bars = [
    { delay: 0,    heights: [20, 55, 30] },
    { delay: 0.18, heights: [35, 75, 45] },
    { delay: 0.08, heights: [50, 90, 60] },
    { delay: 0.25, heights: [28, 80, 38] },
    { delay: 0.12, heights: [60, 95, 70] },
    { delay: 0.22, heights: [32, 65, 40] },
    { delay: 0.05, heights: [45, 70, 52] },
  ];
  const barW = 10;
  const gap = 8;
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const startX = (160 - totalW) / 2;
  const centerY = 80;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Sound wave bars */}
        {bars.map((bar, i) => {
          const x = startX + i * (barW + gap);
          return (
            <motion.rect
              key={i}
              x={x}
              rx={barW / 2}
              width={barW}
              fill="#fb7185"
              opacity={isAnimating ? 0.85 : 0.3}
              animate={isAnimating ? {
                height: bar.heights,
                y: bar.heights.map(h => centerY - h / 2),
              } : {
                height: 6,
                y: centerY - 3,
              }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: bar.delay,
              }}
            />
          );
        })}

        {/* Radiate lines when humming */}
        {isAnimating && [0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <motion.line
              key={i}
              x1={80 + Math.cos(rad) * 14}
              y1={80 + Math.sin(rad) * 14}
              x2={80 + Math.cos(rad) * 14}
              y2={80 + Math.sin(rad) * 14}
              stroke="#fb7185"
              strokeWidth="1.5"
              strokeLinecap="round"
              animate={{
                x2: 80 + Math.cos(rad) * 28,
                y2: 80 + Math.sin(rad) * 28,
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut",
              }}
            />
          );
        })}

        {/* "M" mouth shape suggestion */}
        <motion.path
          d="M 64 106 Q 70 112 80 108 Q 90 112 96 106"
          fill="none"
          stroke="#fda4af"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ opacity: isAnimating ? [0.4, 0.9, 0.4] : 0.3 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Vibration dots */}
        {isAnimating && [64, 74, 84, 96].map((x, i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={120}
            r={2}
            fill="#fb7185"
            animate={{ cy: [120, 117, 120], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </svg>
      <div className="text-rose-500 dark:text-rose-400 font-semibold text-lg h-7">
        {isAnimating ? "Hum steadily" : "Ready"}
      </div>
    </div>
  );
}

// ─── Physiological Sigh: double-inhale + long exhale ─────────────────────────
function SighAnimation({
  breathPhase,
  isAnimating,
}: {
  breathPhase: string;
  isAnimating: boolean;
}) {
  const scale = breathPhase === "inhale" ? 1.45 : breathPhase === "exhale" ? 0.55 : 1.0;
  const label: Record<string, string> = {
    inhale: "Double Inhale",
    hold: "Hold",
    exhale: "Long Exhale",
    hold2: "Rest",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center w-44 h-44">
        <motion.div
          className="w-44 h-44 rounded-full bg-sky-300/20"
          animate={{ scale: isAnimating ? scale : 1 }}
          transition={{ duration: breathPhase === "exhale" ? 6 : 4, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-28 h-28 rounded-full bg-sky-400/50"
          animate={{ scale: isAnimating ? scale : 1 }}
          transition={{ duration: breathPhase === "exhale" ? 6 : 4, ease: "easeInOut" }}
        />
        {/* Inner puff for the second inhale */}
        <motion.div
          className="absolute w-14 h-14 rounded-full bg-sky-500/70"
          animate={{
            scale: breathPhase === "inhale" && isAnimating ? [1, 1.3, 1.6] : 1,
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <div className="absolute text-white font-medium text-xs text-center px-2">
          {isAnimating ? label[breathPhase] : "Ready"}
        </div>
      </div>
      <div className="text-sky-600 dark:text-sky-400 font-semibold text-lg h-7">
        {isAnimating ? label[breathPhase] : ""}
      </div>
    </div>
  );
}

// ─── Dispatch ────────────────────────────────────────────────────────────────
function ExerciseAnimation({
  type,
  breathPhase,
  isAnimating,
}: {
  type: string;
  breathPhase: string;
  isAnimating: boolean;
}) {
  switch (type) {
    case "box_breathing":
      return <BoxBreathingAnimation breathPhase={breathPhase} isAnimating={isAnimating} />;
    case "jaw_release":
      return <JawReleaseAnimation isAnimating={isAnimating} />;
    case "cold_water":
      return <ColdWaterAnimation isAnimating={isAnimating} />;
    case "humming":
      return <HummingAnimation isAnimating={isAnimating} />;
    default:
      return <SighAnimation breathPhase={breathPhase} isAnimating={isAnimating} />;
  }
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Regulate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: exercises, isLoading } = useListRegulationExercises();
  const logExercise = useLogRegulationExercise();

  const [activeExercise, setActiveExercise] = useState<typeof exercises[0] | null>(null);
  const [phase, setPhase] = useState<"select" | "breathing" | "rate">("select");
  const [tensionBefore, setTensionBefore] = useState([6]);
  const [tensionAfter, setTensionAfter] = useState([4]);
  const [breathCount, setBreathCount] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale" | "hold2">("inhale");
  const [isAnimating, setIsAnimating] = useState(false);

  const startExercise = (ex: typeof exercises[0]) => {
    setActiveExercise(ex);
    setPhase("breathing");
    setBreathCount(0);
    setBreathPhase("inhale");
    setIsAnimating(false);
  };

  const startAnimation = (ex: typeof exercises[0] | null = activeExercise) => {
    if (!ex) return;
    setIsAnimating(true);
    runCycle(ex);
  };

  const runCycle = async (ex: typeof exercises[0]) => {
    const cycles = 5;
    for (let i = 0; i < cycles; i++) {
      setBreathPhase("inhale");
      await delay(ex.type === "physiological_sigh" ? 3000 : 4000);
      setBreathPhase("hold");
      await delay(ex.type === "physiological_sigh" ? 1000 : 4000);
      setBreathPhase("exhale");
      await delay(ex.type === "physiological_sigh" ? 7000 : 4000);
      if (ex.type === "box_breathing") {
        setBreathPhase("hold2");
        await delay(4000);
      }
      setBreathCount(i + 1);
    }
    setIsAnimating(false);
    setPhase("rate");
  };

  const handleComplete = async () => {
    if (!activeExercise) return;
    try {
      await logExercise.mutateAsync({
        data: {
          exerciseId: activeExercise.id,
          tensionBefore: tensionBefore[0],
          tensionAfter: tensionAfter[0],
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetDopaminePointsQueryKey() });
      toast({ title: "Exercise complete", description: "+5 points earned" });
      setPhase("select");
      setActiveExercise(null);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-6 min-h-[calc(100dvh-4rem)]">
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h1 className="text-2xl font-semibold text-foreground mb-1">Settle first</h1>
              <p className="text-muted-foreground mb-6 text-sm">Choose what your body needs right now</p>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {exercises?.map((ex, i) => (
                    <motion.button
                      key={ex.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => startExercise(ex)}
                      className={`w-full text-left p-4 rounded-2xl border bg-gradient-to-br ${TYPE_COLORS[ex.type] || ""} hover:shadow-md transition-all duration-200`}
                      data-testid={`exercise-card-${ex.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${TYPE_CIRCLE_COLORS[ex.type] || "bg-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{ex.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {Math.round(ex.durationSeconds / 60)} min · Best for: {ex.bestFor.slice(0, 2).join(", ")}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{ex.description}</div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {phase === "breathing" && activeExercise && (
            <motion.div
              key="breathing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[70vh] text-center"
            >
              <button
                onClick={() => { setPhase("select"); setIsAnimating(false); }}
                className="absolute top-6 left-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-1">{activeExercise.name}</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-xs">{activeExercise.description}</p>

              <div className="mb-6">
                <ExerciseAnimation
                  type={activeExercise.type}
                  breathPhase={breathPhase}
                  isAnimating={isAnimating}
                />
              </div>

              {isAnimating && (
                <p className="text-muted-foreground text-sm mb-6">
                  Cycle {Math.min(breathCount + 1, 5)} of 5
                </p>
              )}

              {!isAnimating && breathCount < 5 && (
                <Button
                  onClick={() => startAnimation(activeExercise)}
                  size="lg"
                  className="gap-2"
                  data-testid="btn-start-breathing"
                >
                  <Play className="w-4 h-4" />
                  {breathCount === 0 ? "Start" : "Continue"}
                </Button>
              )}

              {!isAnimating && breathCount >= 5 && (
                <Button
                  onClick={() => setPhase("rate")}
                  size="lg"
                  className="gap-2"
                  data-testid="btn-rate-exercise"
                >
                  <CheckCircle className="w-4 h-4" />
                  Done — how do you feel?
                </Button>
              )}

              <div className="mt-8 text-left w-full max-w-xs">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Steps</p>
                {activeExercise.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 mb-2 text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "rate" && activeExercise && (
            <motion.div
              key="rate"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wind className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">How did that feel?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Your feedback helps us learn what works for you
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Tension before:{" "}
                    <span className="text-primary">{tensionBefore[0]}/10</span>
                  </label>
                  <Slider
                    value={tensionBefore}
                    onValueChange={setTensionBefore}
                    min={1}
                    max={10}
                    step={1}
                    data-testid="slider-tension-before"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Tension now:{" "}
                    <span className="text-primary">{tensionAfter[0]}/10</span>
                  </label>
                  <Slider
                    value={tensionAfter}
                    onValueChange={setTensionAfter}
                    min={1}
                    max={10}
                    step={1}
                    data-testid="slider-tension-after"
                  />
                </div>

                {tensionAfter[0] < tensionBefore[0] && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-primary/10 rounded-2xl text-sm text-center text-primary font-medium"
                  >
                    Tension dropped by {tensionBefore[0] - tensionAfter[0]} points. That matters.
                  </motion.div>
                )}

                <Button
                  onClick={handleComplete}
                  className="w-full"
                  disabled={logExercise.isPending}
                  data-testid="btn-complete-exercise"
                >
                  {logExercise.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save & earn 5 points"
                  )}
                </Button>

                <button
                  onClick={() => setPhase("select")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Go back to exercises
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
