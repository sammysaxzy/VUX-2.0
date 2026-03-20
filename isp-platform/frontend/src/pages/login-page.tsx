import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useLoginMutation } from "@/hooks/api/use-auth";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().min(3),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const token = useAppStore((state) => state.token);
  const mutation = useLoginMutation();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "noc@westlink.io",
      password: "Password123",
      tenantId: "tenant-west-001",
    },
  });

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [navigate, token]);

  const submit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({
      email: values.email,
      password: values.password,
      tenantId: values.tenantId,
    });
    navigate("/dashboard");
  });

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ISP OSS/BSS Login</CardTitle>
          <CardDescription>Access your tenant NOC workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input id="tenantId" {...form.register("tenantId")} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New ISP tenant?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create workspace
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
