import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useListTasks, 
  useGetTodayCheckin, 
  useCreateCheckin,
  useUpdateTask,
  useGetUserProfile,
  useGetDopaminePoints
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Sparkles, Wind, CheckCircle2, Circle, Star, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

const MOODS = [
  { value: "great", label: "Great", icon: "✨", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30" },
  { value: "good", label: "Good", icon: "😊", color: "bg-sage-100 text-sage-700 dark:bg-sage-900/30" },
  { value: "okay", label: "Okay", icon: "😐", color: "bg-gray-100 text-gray-700 dark:bg-gray-800" },
  { value: "low", label: "Low", icon: "🔋", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30" },
  { value: "overwhelmed", label: "Overwhelmed", icon: "🌊", isDistressed: true },
  { value: "anxious", label: "Anxious", icon: "⚡", isDistressed: true },
  { value: "numb", label: "Numb", icon: "🌫️", isDistressed: true },
  { value: "frustrated", label: "Frustrated", icon: "💢", isDistressed: true },
  { value: "ashamed", label: "Ashamed", icon: "🥀", isDistressed: true },
  { value: "rejected", label: "Rejected", icon: "🌧️", isDistressed: true },
] as const;

export default function Planner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: profile, isLoading: isProfileLoading } = useGetUserProfile();
  const { data: checkin, isLoading: isCheckinLoading } = useGetTodayCheckin();
  const { data: tasks, isLoading: isTasksLoading, refetch: refetchTasks } = useListTasks({ bucket: "today" });
  const { data: points } = useGetDopaminePoints();

  const createCheckin = useCreateCheckin();
  const updateTask = useUpdateTask();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number[]>([5]);

  const isLoading = isProfileLoading || isCheckinLoading || isTasksLoading;

  useEffect(() => {
    // If the checkin is already done and it was a distressed mood, redirect maybe?
    // The spec says: If mood is overwhelmed/ashamed/rejected/anxious — redirect to /regulate before showing tasks.
    // If they already did check-in and are distressed, we might show tasks or suggest regulation.
    // We'll redirect to regulate upon SUBMITTING a distressed mood.
  }, []);

  const handleCheckinSubmit = async () => {
    if (!selectedMood) return;

    try {
      await createCheckin.mutateAsync({
        data: {
          mood: selectedMood as any,
          energyLevel: energyLevel[0],
        }
      });

      const moodDef = MOODS.find(m => m.value === selectedMood);
      if (moodDef?.isDistressed) {
        setLocation("/regulate");
      }
    } catch (e) {
      toast({ title: "Error saving check-in", variant: "destructive" });
    }
  };

  const handleTaskComplete = async (taskId: number, currentBucket: string) => {
    try {
      const isDone = currentBucket === "done";
      const newBucket = isDone ? "today" : "done";
      
      await updateTask.mutateAsync({
        id: taskId,
        data: { bucket: newBucket as any, completedAt: isDone ? null : new Date().toISOString() }
      });
      
      if (!isDone) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4ade80', '#fbbf24', '#818cf8']
        });
      }
      
      refetchTasks();
    } catch (e) {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const needsCheckin = !checkin;
  const todayTasks = tasks?.filter(t => t.bucket === "today" || t.bucket === "done") || [];
  const focusTask = todayTasks.find(t => t.isFocus && t.bucket !== "done");
  const regularTasks = todayTasks.filter(t => !t.isFocus && t.bucket !== "done").slice(0, 5);
  const doneCount = todayTasks.filter(t => t.bucket === "done").length;

  return (
    <Layout>
      <div className="p-4 space-y-6 pb-24">
        
        {/* Context Bar */}
        {!needsCheckin && (
          <header className="flex items-center justify-between pt-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold font-serif">{format(new Date(), "EEEE")}</h1>
              <p className="text-muted-foreground">{format(new Date(), "MMMM do")}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-full shadow-sm border">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{doneCount}</span>
              </div>
              <Link href="/rewards" className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full shadow-sm border border-amber-200 dark:border-amber-800">
                <Star className="w-4 h-4" />
                <span className="font-medium text-sm">{points?.total || 0}</span>
              </Link>
            </div>
          </header>
        )}

        {/* Zone 1: Check-in */}
        {needsCheckin && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl p-6 shadow-sm border mt-4"
          >
            <h2 className="text-xl font-bold mb-1">How are you arriving today?</h2>
            <p className="text-muted-foreground text-sm mb-6">Before we do anything else.</p>
            
            <div className="grid grid-cols-5 gap-3 mb-8">
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood.value;
                return (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="text-2xl mb-1">{mood.icon}</span>
                    <span className="text-[10px] font-medium leading-tight text-center">{mood.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Low energy</span>
                <span>High energy</span>
              </div>
              <Slider
                value={energyLevel}
                onValueChange={setEnergyLevel}
                max={10}
                min={1}
                step={1}
                className="py-2"
              />
            </div>

            <Button 
              className="w-full h-12 rounded-xl text-lg" 
              disabled={!selectedMood || createCheckin.isPending}
              onClick={handleCheckinSubmit}
            >
              {createCheckin.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Check in"}
            </Button>
          </motion.div>
        )}

        {/* Zones 3 & 4: Tasks (Only show if checked in) */}
        {!needsCheckin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Focus Task */}
            {focusTask && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-2">One Thing</h3>
                <Card className="p-1 rounded-2xl border-primary/30 bg-primary/5 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <button 
                      onClick={() => handleTaskComplete(focusTask.id, focusTask.bucket)}
                      className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
                    >
                      <Circle className="w-8 h-8 stroke-[1.5]" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-medium leading-tight mb-1 truncate">{focusTask.title}</p>
                      {focusTask.timeEstimateMinutes && (
                        <p className="text-sm text-muted-foreground">{focusTask.timeEstimateMinutes} min</p>
                      )}
                    </div>
                    <Link href={`/focus?taskId=${focusTask.id}`}>
                      <Button size="icon" className="rounded-full w-12 h-12 shadow-sm bg-primary text-primary-foreground flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            )}

            {/* Task List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pl-2 pr-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today's List</h3>
                <Link href="/braindump" className="text-sm text-primary font-medium hover:underline flex items-center">
                  Add <Plus className="w-4 h-4 ml-1" />
                </Link>
              </div>
              
              {regularTasks.length === 0 && !focusTask ? (
                <div className="text-center p-8 bg-card/50 rounded-2xl border border-dashed">
                  <p className="text-muted-foreground mb-4">Nothing demanding your attention right now.</p>
                  <Link href="/braindump">
                    <Button variant="outline" className="rounded-xl">Empty your brain</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {regularTasks.map(task => (
                    <Card key={task.id} className="p-3 rounded-xl border-border/50 shadow-none hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleTaskComplete(task.id, task.bucket)}
                          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Circle className="w-6 h-6 stroke-[1.5]" />
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setLocation(`/breakdown/${task.id}`)}>
                          <p className="font-medium text-foreground truncate">{task.title}</p>
                        </div>
                        <Link href={`/breakdown/${task.id}`}>
                          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Rest / Stop Action */}
            <div className="pt-6 pb-2">
              <Button 
                variant="outline" 
                className="w-full h-14 rounded-2xl border-dashed text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => setLocation('/regulate')}
              >
                <Wind className="w-5 h-5 mr-2" />
                I need a break
              </Button>
            </div>
            
          </motion.div>
        )}
      </div>
    </Layout>
  );
}