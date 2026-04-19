import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTask, useUpdateTask, useCreateSession, useUpdateSession } from "@workspace/api-client-react";
import { getListTasksQueryKey, getGetDailyInsightsQueryKey, getGetDopaminePointsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

export default function FocusSession() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const taskId = parseInt(params.get("taskId") ?? "0", 10);
  const duration = parseInt(params.get("duration") ?? "25", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useGetTask(taskId, { query: { enabled: !!taskId, queryKey: getListTasksQueryKey() } });
  const updateTask = useUpdateTask();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "running" | "done" | "abandoned">("ready");
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = duration * 60;
  const progress = secondsLeft / totalSeconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            handleComplete();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  const handleStart = async () => {
    try {
      const session = await createSession.mutateAsync({
        data: { taskId, durationMinutes: duration }
      });
      setSessionId(session.id);
      setPhase("running");
    } catch {
      setPhase("running");
    }
  };

  const handleComplete = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("done");

    await updateTask.mutateAsync({
      id: taskId,
      data: { completedAt: new Date().toISOString() }
    });

    if (sessionId) {
      await updateSession.mutateAsync({
        id: sessionId,
        data: { status: "completed", endedAt: new Date().toISOString() }
      });
    }

    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDailyInsightsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDopaminePointsQueryKey() });

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#6EAF8A", "#C9915A", "#7B8FBE", "#E8C16F"],
    });
  };

  const handleAbandon = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("abandoned");

    if (sessionId) {
      await updateSession.mutateAsync({
        id: sessionId,
        data: { status: "abandoned", endedAt: new Date().toISOString() }
      });
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md bg-background min-h-[100dvh] flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center w-full">
              <div className="text-muted-foreground text-sm mb-3">Ready to focus?</div>
              <h1 className="text-2xl font-semibold text-foreground mb-2 line-clamp-3">{task?.title}</h1>
              <div className="text-muted-foreground text-sm mb-8">{duration} minute session</div>
              <Button onClick={handleStart} size="lg" className="w-full mb-4" disabled={createSession.isPending} data-testid="btn-start-focus">
                {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start focus session"}
              </Button>
              <button onClick={() => setLocation("/planner")} className="text-sm text-muted-foreground hover:text-foreground" data-testid="btn-back-to-planner">
                Not now
              </button>
            </motion.div>
          )}

          {phase === "running" && (
            <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center w-full">
              <p className="text-muted-foreground text-sm mb-6">Phone down. One thing at a time.</p>
              <h2 className="text-xl font-semibold mb-8 px-4 line-clamp-3">{task?.title}</h2>

              <div className="relative flex items-center justify-center mb-8">
                <svg width="220" height="220" className="-rotate-90">
                  <circle
                    cx="110" cy="110" r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/30"
                  />
                  <motion.circle
                    cx="110" cy="110" r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    className="text-primary"
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-4xl font-bold text-foreground tabular-nums">{formatTime(secondsLeft)}</div>
                  <div className="text-xs text-muted-foreground mt-1">remaining</div>
                </div>
              </div>

              <Button onClick={handleComplete} variant="outline" className="mb-3 w-full" data-testid="btn-end-early">
                Mark done
              </Button>
              <button onClick={handleAbandon} className="text-xs text-muted-foreground hover:text-foreground" data-testid="btn-abandon">
                End session early
              </button>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full">
              <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">You did it.</h2>
              <p className="text-muted-foreground mb-2">+25 points earned</p>
              <p className="text-muted-foreground text-sm mb-8">Task marked done. That counts.</p>
              <div className="space-y-3 w-full">
                <Button onClick={() => setLocation("/planner")} className="w-full" data-testid="btn-back-after-done">
                  Back to planner
                </Button>
                <button onClick={() => setLocation("/rewards")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground" data-testid="btn-take-break">
                  Take a break (you earned it)
                </button>
              </div>
            </motion.div>
          )}

          {phase === "abandoned" && (
            <motion.div key="abandoned" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
              <h2 className="text-xl font-semibold mb-3">Stopped early — still counts.</h2>
              <p className="text-muted-foreground mb-8">You showed up. That's the hardest part.</p>
              <div className="space-y-3 w-full">
                <Button onClick={() => { setPhase("ready"); setSecondsLeft(duration * 60); }} variant="outline" className="w-full" data-testid="btn-restart-focus">
                  Try again
                </Button>
                <Button onClick={() => setLocation("/planner")} className="w-full" data-testid="btn-move-on">
                  Move on
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
