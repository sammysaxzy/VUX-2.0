import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerPortalLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("demo_user");
  const [password, setPassword] = useState("pppoe-1234");
  const [submitting, setSubmitting] = useState(false);

  const login = async () => {
    setSubmitting(true);
    try {
      const session = await apiClient.customerPortalLogin({ username, password });
      window.sessionStorage.setItem("portal-session", JSON.stringify(session));
      navigate("/portal");
    } catch {
      toast.error("Unable to sign in to the customer portal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Customer Portal</CardTitle>
          <CardDescription>Customers can view plans, payments, complaints, and ticket status from this self-service portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Username</Label>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button onClick={() => void login()} disabled={submitting} className="w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
