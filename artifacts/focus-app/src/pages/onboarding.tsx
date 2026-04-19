import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpsertUserProfile, useCreateTask } from "@workspace/api-client-react";
import { Check, ArrowRight, Loader2 } from "lucide-react";

const STRUGGLES = [
  "Getting started",
  "Losing track of time",
  "Finishing things",
  "Remembering",
  "Feeling overwhelmed"
];

const NUDGE_TIMES = ["7am", "8am", "9am", "10am", "No nudge"];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [struggles, setStruggles] = useState<string[]>([]);
  const [nudgeTime, setNudgeTime] = useState<string>("9am");
  const [firstTask, setFirstTask] = useState("");

  const upsertProfile = useUpsertUserProfile();
  const createTask = useCreateTask();

  const handleNext = () => setStep(s => s + 1);

  const handleComplete = async () => {
    try {
      await upsertProfile.mutateAsync({
        data: {
          name,
          struggles,
          nudgeTime: nudgeTime === "No nudge" ? null : nudgeTime,
          onboardingComplete: true
        }
      });

      if (firstTask.trim()) {
        await createTask.mutateAsync({
          data: {
            title: firstTask,
            bucket: "today"
          }
        });
      }

      setLocation("/planner");
    } catch (e) {
      console.error("Failed to complete onboarding", e);
    }
  };

  const toggleStruggle = (s: string) => {
    setStruggles(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden relative">
      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col items-center text-center space-y-8"
            >
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                <span className="text-4xl font-serif italic">f</span>
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to Focus</h1>
                <p className="text-muted-foreground text-lg px-4">
                  A safe space for your mind. We're here to help you regulate and gently guide you through your day.
                </p>
              </div>
              <div className="pt-8 w-full space-y-4">
                <Button size="lg" className="w-full text-lg h-14 rounded-xl" onClick={handleNext}>
                  No long setup. Just a few questions.
                </Button>
                <p className="text-sm text-muted-foreground">Takes about 90 seconds</p>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">What should we call you?</h2>
                <p className="text-muted-foreground">This helps make it feel more like your space.</p>
              </div>
              
              <Input 
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="text-xl h-14 bg-card border-none shadow-sm rounded-xl px-4"
                onKeyDown={e => e.key === "Enter" && handleNext()}
              />

              <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={handleNext} className="text-muted-foreground hover:text-foreground">
                  Skip for now
                </Button>
                <Button size="lg" onClick={handleNext} disabled={!name.trim()} className="rounded-xl px-8">
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">What feels hardest lately?</h2>
                <p className="text-muted-foreground">Select any that resonate. No judgment here.</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {STRUGGLES.map(s => {
                  const isSelected = struggles.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStruggle(s)}
                      className={`px-5 py-3 rounded-2xl text-left transition-all duration-200 border ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]' 
                          : 'bg-card text-foreground border-transparent hover:border-border hover:bg-accent/5'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleNext} className="rounded-xl px-8 w-full sm:w-auto">
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">When would you like a gentle morning nudge?</h2>
                <p className="text-muted-foreground">Just a soft reminder to check in with yourself.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {NUDGE_TIMES.map(time => (
                  <button
                    key={time}
                    onClick={() => setNudgeTime(time)}
                    className={`p-4 rounded-2xl text-center transition-all duration-200 border ${
                      nudgeTime === time 
                        ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                        : 'bg-card text-foreground border-transparent hover:border-border'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleNext} className="rounded-xl px-8 w-full sm:w-auto">
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">What's one thing on your mind right now?</h2>
                <p className="text-muted-foreground">Big or small, let's just capture it.</p>
              </div>
              
              <Input 
                autoFocus
                value={firstTask}
                onChange={e => setFirstTask(e.target.value)}
                placeholder="e.g. Call the dentist, drink water..."
                className="text-lg h-16 bg-card border-none shadow-sm rounded-xl px-4"
                onKeyDown={e => e.key === "Enter" && handleNext()}
              />

              <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={handleNext} className="text-muted-foreground">
                  Skip
                </Button>
                <Button size="lg" onClick={handleNext} disabled={!firstTask.trim()} className="rounded-xl px-8">
                  Capture <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center text-center space-y-8"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">You're all set.</h2>
                <p className="text-muted-foreground text-lg">
                  {name ? `Thanks for sharing, ${name}. ` : ''}Your space is ready.
                </p>
              </div>

              {firstTask && (
                <div className="w-full bg-card p-6 rounded-2xl shadow-sm text-left border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">We saved this for you:</p>
                  <p className="font-medium text-lg">{firstTask}</p>
                </div>
              )}

              <Button 
                size="lg" 
                onClick={handleComplete} 
                disabled={upsertProfile.isPending || createTask.isPending}
                className="w-full h-14 rounded-xl text-lg mt-8"
              >
                {upsertProfile.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Open my planner"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Progress indicator */}
      {step > 0 && step < 5 && (
        <div className="absolute top-8 left-0 right-0 px-8 flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-primary' : 'bg-primary/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}