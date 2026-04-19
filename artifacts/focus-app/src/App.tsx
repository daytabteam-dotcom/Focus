import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Onboarding from "./pages/onboarding";
import ReturnPage from "./pages/return";
import Planner from "./pages/planner";
import Regulate from "./pages/regulate";
import Focus from "./pages/focus";
import Breakdown from "./pages/breakdown";
import Braindump from "./pages/braindump";
import Rewards from "./pages/rewards";
import Insights from "./pages/insights";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/return" component={ReturnPage} />
      <Route path="/planner" component={Planner} />
      <Route path="/regulate" component={Regulate} />
      <Route path="/focus" component={Focus} />
      <Route path="/breakdown/:taskId" component={Breakdown} />
      <Route path="/braindump" component={Braindump} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/insights" component={Insights} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
