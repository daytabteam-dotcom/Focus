import { motion } from "framer-motion";
import { useGetDailyInsights, useGetWeeklyInsights } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Loader2, TrendingUp, Clock, Wind } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

export default function Insights() {
  const { data: daily, isLoading: isDailyLoading } = useGetDailyInsights();
  const { data: weekly, isLoading: isWeeklyLoading } = useGetWeeklyInsights();

  const isLoading = isDailyLoading || isWeeklyLoading;

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-1">Look what you did</h1>
        <p className="text-muted-foreground text-sm mb-6">This week at a glance</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center" data-testid="stat-tasks">
                <div className="text-2xl font-bold text-primary">{daily?.tasksCompleted ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">today</div>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/20 border border-secondary/30 text-center" data-testid="stat-points">
                <div className="text-2xl font-bold text-secondary-foreground">{daily?.pointsEarned ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">points today</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border-card-border border text-center" data-testid="stat-focus">
                <div className="text-2xl font-bold text-foreground">{daily?.focusMinutes ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">focus min</div>
              </div>
            </motion.div>

            {daily?.streakDots && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6">
                <p className="text-xs font-medium text-muted-foreground mb-3">This week</p>
                <div className="flex gap-2">
                  {daily.streakDots.map((active, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full transition-all ${active ? "bg-primary" : "bg-muted/40"}`}
                      data-testid={`streak-dot-${i}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {weekly && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-6">
                <p className="text-xs font-medium text-muted-foreground mb-3">Tasks completed by day</p>
                <div className="h-36 w-full" data-testid="chart-tasks-by-day">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly.tasksByDay} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {weekly.tasksByDay.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.count > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                            fillOpacity={entry.count > 0 ? 0.85 : 0.4}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              {weekly?.totalFocusMinutes != null && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-card-border">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{weekly.totalFocusMinutes} minutes focused</div>
                    <div className="text-xs text-muted-foreground">this week</div>
                  </div>
                </motion.div>
              )}

              {weekly?.totalPointsEarned != null && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-card-border">
                  <TrendingUp className="w-5 h-5 text-secondary flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{weekly.totalPointsEarned} points earned</div>
                    <div className="text-xs text-muted-foreground">this week</div>
                  </div>
                </motion.div>
              )}

              {weekly?.bestRegulationExercise && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-card-border">
                  <Wind className="w-5 h-5 text-sky-500 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{weekly.bestRegulationExercise}</div>
                    <div className="text-xs text-muted-foreground">your most effective regulation exercise</div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
