import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./components/layout/AppLayout";
import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers/index";
import CustomerProfile from "./pages/customers/profile";
import Orders from "./pages/orders";
import Payments from "./pages/payments";
import Reports from "./pages/reports";
import Settings from "./pages/settings";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // Wait for localStorage read

  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>

      {/* Redirect root → dashboard or login */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>

      {/* Protected routes */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/customers" component={() => <ProtectedRoute component={Customers} />} />
      <Route path="/customers/:id" component={() => <ProtectedRoute component={CustomerProfile} />} />
      <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
      <Route path="/payments" component={() => <ProtectedRoute component={Payments} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

      {/* 404 */}
      <Route>
        <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
          <div className="text-center">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="mt-2 text-muted-foreground">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;