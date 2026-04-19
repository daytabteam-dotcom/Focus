import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTask, useGetTaskSteps, useGenerateTaskSteps, useUpdateTaskStep, useUpdateTask } from "@workspace/api-client-react";
import { getGetTaskStepsQueryKey, getListTasksQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Circle, Clock, ArrowLeft, SkipForward, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export default function Breakdown() {
  const { taskId } = useParams<{ taskId: string }>();
  const id = parseInt(taskId ?? "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: task, isLoading: isTaskLoading } = useGetTask(id, {
    query: { enabled: !!id, queryKey: getListTasksQueryKey() }
  });
  const { data: steps, isLoading: isStepsLoading } = useGetTaskSteps(id, {
    query: { enabled: !!id, queryKey: getGetTaskStepsQueryKey(id) }
  });

  const generateSteps = useGenerateTaskSteps();
  const updateStep = useUpdateTaskStep();
  const updateTask = useUpdateTask();

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSteps.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetTaskStepsQueryKey(id) });
    } catch {
      toast({ title: "Couldn't generate steps", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleStepDone = async (stepId: number) => {
    await updateStep.mutateAsync({
      taskId: id,
      stepId,
      data: { status: "done" }
    });
    queryClient.invalidateQueries({ queryKey: getGetTaskStepsQueryKey(id) });

    const allDone = steps?.every(s => s.id === stepId || s.status === "done");
    if (allDone) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#6EAF8A", "#C9915A"] });
      await updateTask.mutateAsync({
        id,
        data: { completedAt: new Date().toISOString() }
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Task complete", description: "+10 points" });
    }
  };

  const handleSkip = async (stepId: number) => {
    await updateStep.mutateAsync({
      taskId: id,
      stepId,
      data: { status: "skipped" }
    });
    queryClient.invalidateQueries({ queryKey: getGetTaskStepsQueryKey(id) });
  };

  if (isTaskLoading || isStepsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const doneCount = steps?.filter(s => s.status === "done").length ?? 0;
  const progressPct = steps?.length ? (doneCount / steps.length) * 100 : 0;

  return (
    <Layout>
      <div className="p-6 min-h-[calc(100dvh-4rem)]">
        <button onClick={() => setLocation("/planner")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-xl font-semibold mb-1 line-clamp-2">{task?.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">Break it into small enough pieces that starting feels easy</p>

        {steps && steps.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{doneCount} of {steps.length} done</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {(!steps || steps.length === 0) ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6 text-sm">Break this task into smaller, manageable steps</p>
            <Button onClick={handleGenerate} disabled={generating} data-testid="btn-generate-steps">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Break it down
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-2xl border transition-all ${
                    step.status === "done"
                      ? "bg-primary/5 border-primary/20 opacity-60"
                      : step.status === "skipped"
                      ? "bg-muted/50 border-muted opacity-40"
                      : "bg-card border-card-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === "done" ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${step.status !== "pending" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {step.title}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{step.timeEstimateMinutes} min</span>
                        {i === 0 && step.status === "pending" && (
                          <span className="ml-2 text-xs text-primary font-medium">Start here</span>
                        )}
                      </div>
                    </div>
                    {step.status === "pending" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleSkip(step.id)}
                          className="text-muted-foreground hover:text-foreground p-1"
                          data-testid={`btn-skip-step-${step.id}`}
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStepDone(step.id)}
                          className="text-primary hover:text-primary/80 font-medium text-xs px-2 py-1 rounded-lg bg-primary/10"
                          data-testid={`btn-done-step-${step.id}`}
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button variant="outline" onClick={handleGenerate} disabled={generating} className="w-full mt-4" data-testid="btn-regenerate-steps">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Regenerate steps
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
