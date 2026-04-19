import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetUserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";

export default function ReturnPage() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useGetUserProfile({ query: { queryKey: ["/api/users/profile"] } });

  useEffect(() => {
    if (!isLoading && !profile) {
      setLocation("/");
    }
  }, [profile, isLoading, setLocation]);

  if (isLoading) {
    return (
      <Layout showNav={false}>
        <div className="flex-1 flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Determine message based on last open, or default to a warm greeting
  let greeting = `Welcome back${profile?.name ? `, ${profile.name}` : ''}.`;
  let subtext = "It's good to see you. Take a breath, settle in.";

  if (profile?.lastOpenAt) {
    const lastOpen = new Date(profile.lastOpenAt);
    const now = new Date();
    const diffHours = (now.getTime() - lastOpen.getTime()) / (1000 * 60 * 60);

    if (diffHours < 12) {
      greeting = "Still here.";
      subtext = "Pacing yourself is the best way forward.";
    } else if (diffHours > 72) {
      greeting = "We saved your spot.";
      subtext = "No pressure, no catching up. Just right now.";
    }
  }

  return (
    <Layout showNav={false}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[100dvh]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8 max-w-xs w-full"
        >
          <div className="space-y-4">
            <h1 className="text-3xl font-bold font-serif text-foreground leading-tight">
              {greeting}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {subtext}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="pt-12"
          >
            <Button 
              size="lg" 
              onClick={() => setLocation("/planner")}
              className="w-full rounded-2xl h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              Enter my planner
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}