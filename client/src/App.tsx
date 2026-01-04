import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Trading from "@/pages/Trading";
import TransactionsPage from "@/pages/Transactions";
import AdminPanel from "@/pages/AdminPanel";
import Layout from "@/components/Layout";

function ProtectedRoute({ component: Component, requireAdmin = false }: { component: React.ComponentType, requireAdmin?: boolean }) {
  const { user, isLoadingUser } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoadingUser && !user) {
      setLocation("/auth");
    } else if (!isLoadingUser && user && requireAdmin) {
      // In a real app, we'd check against the actual admin wallet from config
      // For now, we'll check against the hardcoded admin wallet address
      const adminWallet = "0xb416D5C1D8a7546F5Be3FA550374868d90d79615";
      if (user.walletAddress.toLowerCase() !== adminWallet.toLowerCase()) {
        setLocation("/");
      }
    }
  }, [user, isLoadingUser, setLocation, requireAdmin]);

  if (isLoadingUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        <Layout>
          <ProtectedRoute component={Dashboard} />
        </Layout>
      </Route>
      
      <Route path="/trading">
        <Layout>
          <ProtectedRoute component={Trading} />
        </Layout>
      </Route>

      <Route path="/transactions">
        <Layout>
          <ProtectedRoute component={TransactionsPage} />
        </Layout>
      </Route>

      <Route path="/admin">
        <Layout>
          <ProtectedRoute component={AdminPanel} requireAdmin={true} />
        </Layout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
