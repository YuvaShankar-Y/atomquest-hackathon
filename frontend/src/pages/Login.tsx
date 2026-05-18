import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = "/dashboard";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login({ email, password });
      toast({ title: "Welcome back!", description: "You are now signed in." });
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: getErrorMessage(error, "Invalid credentials"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSelect = async (email: string) => {
    setIsSubmitting(true);
    setEmail(email);
    setPassword("demo123");

    try {
      await login({ email, password: "demo123" });
      toast({ title: "Demo Sign-in", description: `Signed in as ${email}` });
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Demo login failed",
        description: getErrorMessage(error, "Invalid credentials"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your hackathon dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Select onValueChange={handleDemoSelect} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a demo account..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin@hackathon.dev">Admin</SelectItem>
                  <SelectItem value="manager1@hackathon.dev">Manager 1</SelectItem>
                  <SelectItem value="manager2@hackathon.dev">Manager 2</SelectItem>
                  <SelectItem value="employee1@hackathon.dev">Employee 1 (No Goals)</SelectItem>
                  <SelectItem value="employee2@hackathon.dev">Employee 2 (Submitted)</SelectItem>
                  <SelectItem value="employee3@hackathon.dev">Employee 3 (Approved, Checkins)</SelectItem>
                  <SelectItem value="employee4@hackathon.dev">Employee 4 (Approved, No Checkins)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
