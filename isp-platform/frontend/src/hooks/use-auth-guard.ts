import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";

export function useAuthGuard() {
  const token = useAppStore((state) => state.token);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
    if (!token && !isAuthRoute) {
      navigate("/login", { replace: true });
    }
    if (token && isAuthRoute) {
      navigate("/dashboard", { replace: true });
    }
  }, [pathname, navigate, token]);
}
