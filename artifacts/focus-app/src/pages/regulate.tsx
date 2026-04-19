import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListRegulationExercises, useLogRegulationExercise } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Wind, ArrowLeft, Play, CheckCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
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

export default function Regulate() {
  const [, setLocation] = useLocation();
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

  const startAnimation = () => {
    setIsAnimating(true);
    runBreathCycle();
  };

  const runBreathCycle = async () => {
    const cycles = 5;
    for (let i = 0; i < cycles; i++) {
      setBreathPhase("inhale");
      await delay(4000);
      setBreathPhase("hold");
      await delay(4000);
      setBreathPhase("exhale");
      await delay(4000);
      if (activeExercise?.type === "box_breathing") {
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
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetDopaminePointsQueryKey() });
      toast({ title: "Exercise complete", description: "+5 points earned" });
      setPhase("select");
      setActiveExercise(null);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const breathLabel: Record<string, string> = {
    inhale: "Breathe In",
    hold: "Hold",
    exhale: "Breathe Out",
    hold2: "Hold Empty",
  };

  const circleScale = breathPhase === "inhale" ? 1.4 : breathPhase === "exhale" ? 0.6 : 1.0;

  return (
    <Layout>
      <div className="p-6 min-h-[calc(100dvh-4rem)]">
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
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
                          <div className="text-xs text-muted-foreground mt-0.5">{Math.round(ex.durationSeconds / 60)} min · Best for: {ex.bestFor.slice(0, 2).join(", ")}</div>
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
            <motion.div key="breathing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <button
                onClick={() => { setPhase("select"); setIsAnimating(false); }}
                className="absolute top-6 left-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-2">{activeExercise.name}</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-xs">{activeExercise.description}</p>

              <div className="relative flex items-center justify-center mb-8">
                <motion.div
                  className={`w-40 h-40 rounded-full opacity-30 ${TYPE_CIRCLE_COLORS[activeExercise.type] || "bg-primary"}`}
                  animate={{ scale: isAnimating ? circleScale : 1 }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                />
                <motion.div
                  className={`absolute w-24 h-24 rounded-full ${TYPE_CIRCLE_COLORS[activeExercise.type] || "bg-primary"} opacity-70`}
                  animate={{ scale: isAnimating ? circleScale : 1 }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                />
                <div className="absolute text-white font-medium text-sm">
                  {isAnimating ? breathLabel[breathPhase] : "Ready"}
                </div>
              </div>

              {isAnimating && (
                <p className="text-muted-foreground text-sm mb-6">Cycle {Math.min(breathCount + 1, 5)} of 5</p>
              )}

              {!isAnimating && breathCount < 5 && (
                <Button onClick={startAnimation} size="lg" className="gap-2" data-testid="btn-start-breathing">
                  <Play className="w-4 h-4" />
                  {breathCount === 0 ? "Start" : "Continue"}
                </Button>
              )}

              {!isAnimating && breathCount >= 5 && (
                <Button onClick={() => setPhase("rate")} size="lg" className="gap-2" data-testid="btn-rate-exercise">
                  <CheckCircle className="w-4 h-4" />
                  Done — how do you feel?
                </Button>
              )}

              <div className="mt-8 text-left w-full max-w-xs">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Steps</p>
                {activeExercise.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 mb-2 text-sm text-muted-foreground">
                    <span className="text-primary font-medium mt-0">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "rate" && activeExercise && (
            <motion.div key="rate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wind className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">How did that feel?</h2>
                <p className="text-muted-foreground text-sm mt-1">Your feedback helps us learn what works for you</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Tension before: <span className="text-primary">{tensionBefore[0]}/10</span></label>
                  <Slider value={tensionBefore} onValueChange={setTensionBefore} min={1} max={10} step={1} data-testid="slider-tension-before" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">Tension now: <span className="text-primary">{tensionAfter[0]}/10</span></label>
                  <Slider value={tensionAfter} onValueChange={setTensionAfter} min={1} max={10} step={1} data-testid="slider-tension-after" />
                </div>

                {tensionAfter[0] < tensionBefore[0] && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-primary/10 rounded-2xl text-sm text-center text-primary font-medium">
                    Tension dropped by {tensionBefore[0] - tensionAfter[0]} points. That matters.
                  </motion.div>
                )}

                <Button onClick={handleComplete} className="w-full" disabled={logExercise.isPending} data-testid="btn-complete-exercise">
                  {logExercise.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & earn 5 points"}
                </Button>

                <button onClick={() => setPhase("select")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
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
  return new Promise(res => setTimeout(res, ms));
}
