import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useAppStore((state) => state.token);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const authRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
    if (!token && !authRoute) {
      navigate("/login", { replace: true });
    }
    if (token && authRoute) {
      navigate("/dashboard", { replace: true });
    }
  }, [pathname, navigate, token]);

  return <>{children}</>;
}
