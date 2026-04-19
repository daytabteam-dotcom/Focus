import { motion } from "framer-motion";
import { useGetDopaminePoints, useListRewards, useRedeemReward } from "@workspace/api-client-react";
import { getGetDopaminePointsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift, Zap } from "lucide-react";

export default function Rewards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: points, isLoading: isPointsLoading } = useGetDopaminePoints();
  const { data: rewards, isLoading: isRewardsLoading } = useListRewards();
  const redeem = useRedeemReward();

  const handleRedeem = async (rewardId: number, rewardName: string, cost: number) => {
    if ((points?.total ?? 0) < cost) {
      toast({ title: "Not enough points yet", description: `You need ${cost - (points?.total ?? 0)} more points` });
      return;
    }
    try {
      await redeem.mutateAsync({ id: rewardId });
      queryClient.invalidateQueries({ queryKey: getGetDopaminePointsQueryKey() });
      toast({ title: "You earned this", description: rewardName });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-1">Rewards</h1>
        <p className="text-muted-foreground text-sm mb-6">You earned these. Spend them without guilt.</p>

        {isPointsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-primary" data-testid="points-total">{points?.total ?? 0}</div>
                <div className="text-xs text-muted-foreground">total points · {points?.todayEarned ?? 0} today · {points?.weekEarned ?? 0} this week</div>
              </div>
            </div>

            {points?.recentEvents && points.recentEvents.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Recent</p>
                {points.recentEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="flex justify-between text-xs" data-testid={`event-${event.id}`}>
                    <span className="text-muted-foreground">{event.reason}</span>
                    <span className={event.points > 0 ? "text-primary font-medium" : "text-destructive"}>
                      {event.points > 0 ? "+" : ""}{event.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">How you earn</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Task completed", "+10"],
              ["Focus session", "+15"],
              ["Regulation exercise", "+5"],
              ["Mood check-in", "+3"],
              ["Brain dump", "+2"],
              ["Daily open", "+5"],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between p-2.5 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-primary font-medium">{pts}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Spend your points</h2>
          {isRewardsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {rewards?.map((reward, i) => {
                const canAfford = (points?.total ?? 0) >= reward.pointCost;
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-2xl border ${canAfford ? "bg-card border-card-border" : "bg-muted/20 border-muted/30 opacity-60"}`}
                    data-testid={`reward-card-${reward.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">{reward.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{reward.description}</div>
                      </div>
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "outline"}
                        onClick={() => handleRedeem(reward.id, reward.name, reward.pointCost)}
                        disabled={!canAfford || redeem.isPending}
                        className="flex-shrink-0 text-xs"
                        data-testid={`btn-redeem-${reward.id}`}
                      >
                        {reward.pointCost} pts
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
