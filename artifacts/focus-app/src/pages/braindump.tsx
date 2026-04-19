import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateBrainDump, useConfirmBrainDumpTriage, useListBrainDumps } from "@workspace/api-client-react";
import { getListBrainDumpsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

const BUCKET_LABELS: Record<string, { label: string; description: string; color: string }> = {
  today: {
    label: "Add to today",
    description: "This feels urgent or time-sensitive",
    color: "border-primary/40 bg-primary/5 hover:bg-primary/10",
  },
  later: {
    label: "Save for later",
    description: "Relevant, but not right now",
    color: "border-secondary/40 bg-secondary/5 hover:bg-secondary/10",
  },
  remind: {
    label: "Remind me",
    description: "Needs a specific time or trigger",
    color: "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30",
  },
  letitgo: {
    label: "Let it go",
    description: "This is worry, not an action",
    color: "border-muted bg-muted/30 hover:bg-muted/50",
  },
};

export default function Braindump() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<"input" | "triage" | "done">("input");
  const [dumpId, setDumpId] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [triageReason, setTriageReason] = useState<string | null>(null);

  const createDump = useCreateBrainDump();
  const confirmTriage = useConfirmBrainDumpTriage();
  const { data: history } = useListBrainDumps();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      const dump = await createDump.mutateAsync({ data: { content } });
      setDumpId(dump.id);
      setSuggestion(dump.suggestedBucket ?? "later");
      setTriageReason(dump.triageReason ?? null);
      setPhase("triage");
      queryClient.invalidateQueries({ queryKey: getListBrainDumpsQueryKey() });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleConfirm = async (bucket: string) => {
    if (!dumpId) return;
    try {
      await confirmTriage.mutateAsync({ id: dumpId, data: { bucket: bucket as "today" | "later" | "remind" | "letitgo" } });
      queryClient.invalidateQueries({ queryKey: getListBrainDumpsQueryKey() });
      toast({ title: "Got it", description: bucket === "letitgo" ? "Released — good." : "Saved." });
      setPhase("done");
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setContent("");
    setDumpId(null);
    setSuggestion(null);
    setTriageReason(null);
    setPhase("input");
  };

  return (
    <Layout>
      <div className="p-6 min-h-[calc(100dvh-4rem)]">
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-semibold mb-1">Brain dump</h1>
              <p className="text-muted-foreground text-sm mb-6">What's on your mind? No structure needed.</p>

              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Just type it out..."
                className="min-h-[180px] text-base resize-none mb-4 border-border rounded-2xl"
                data-testid="textarea-braindump"
                autoFocus
              />

              <Button onClick={handleSubmit} disabled={!content.trim() || createDump.isPending} className="w-full gap-2" data-testid="btn-submit-braindump">
                {createDump.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Figure it out
              </Button>

              {history && history.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent thoughts</h2>
                  <div className="space-y-2">
                    {history.slice(0, 5).map(d => (
                      <div key={d.id} className="p-3 rounded-xl bg-muted/30 text-sm" data-testid={`history-item-${d.id}`}>
                        <p className="text-foreground line-clamp-2">{d.content}</p>
                        {d.confirmedBucket && (
                          <p className="text-xs text-muted-foreground mt-1">{BUCKET_LABELS[d.confirmedBucket]?.label ?? d.confirmedBucket}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === "triage" && (
            <motion.div key="triage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-semibold mb-2">Where does this go?</h2>
              {triageReason && (
                <p className="text-muted-foreground text-sm mb-6">{triageReason}</p>
              )}

              <div className="p-4 bg-muted/30 rounded-2xl mb-6 text-sm text-foreground">
                "{content}"
              </div>

              <div className="space-y-3">
                {Object.entries(BUCKET_LABELS).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => handleConfirm(key)}
                    disabled={confirmTriage.isPending}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${meta.color} ${suggestion === key ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    data-testid={`btn-bucket-${key}`}
                  >
                    <div className="font-medium text-sm text-foreground">{meta.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
                    {suggestion === key && (
                      <div className="text-xs text-primary font-medium mt-1">Suggested</div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M6 14l5 5 11-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Out of your head.</h2>
              <p className="text-muted-foreground mb-8 text-sm">That thought has a home now.</p>
              <Button onClick={handleReset} className="w-full" data-testid="btn-dump-another">
                Dump another thought
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
