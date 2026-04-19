import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Wind, Gift, BarChart, PlusCircle } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md bg-background min-h-[100dvh] shadow-xl relative flex flex-col">
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {showNav && (
          <nav className="absolute bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-t border-border flex items-center justify-around px-4 z-50">
            <Link href="/planner" className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${location === "/planner" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/regulate" className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${location === "/regulate" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Wind className="w-5 h-5" />
            </Link>
            <Link href="/braindump" className={`flex flex-col items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg -translate-y-4 hover:bg-primary/90 transition-colors`}>
              <PlusCircle className="w-6 h-6" />
            </Link>
            <Link href="/rewards" className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${location === "/rewards" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Gift className="w-5 h-5" />
            </Link>
            <Link href="/insights" className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${location === "/insights" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <BarChart className="w-5 h-5" />
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
