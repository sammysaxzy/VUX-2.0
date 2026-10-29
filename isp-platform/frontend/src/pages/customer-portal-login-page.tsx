"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { getPortalConfig, getPortalTenantStyle, resolvePortalTenantId } from "@/lib/portal/tenant-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerPortalSession } from "@/types";

const HERO_IMAGE_URL =
  "https://images.pexels.com/photos/8867417/pexels-photo-8867417.jpeg?auto=compress&cs=tinysrgb&w=1200";

export function CustomerPortalLoginPage() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(() => new URLSearchParams(window.location.search).get("identity") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const tenantId = useMemo(
    () =>
      resolvePortalTenantId({
        hostname: window.location.hostname,
        search: window.location.search,
        identity,
      }),
    [identity],
  );

  const portalConfig = getPortalConfig(tenantId);
  const tenantStyle = useMemo(() => getPortalTenantStyle(portalConfig), [portalConfig]);

  const login = async () => {
    if (!identity.trim() || !password.trim()) {
      setErrorMessage("Enter your Service ID and password.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const session = await apiClient.customerPortalLogin({
        identity,
        password,
        tenantId: portalConfig.tenantId,
      });

      window.sessionStorage.setItem("portal-session", JSON.stringify(session satisfies CustomerPortalSession));

      if (keepSignedIn) {
        window.localStorage.setItem("portal-last-identity", identity.trim());
      } else {
        window.localStorage.removeItem("portal-last-identity");
      }

      navigate("/portal");
    } catch {
      const nextError = "Service ID or password is incorrect.";
      setErrorMessage(nextError);
      toast.error(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="portal-ui min-h-screen bg-[#f8f8fa] text-slate-950"
      style={{
        ...tenantStyle,
        backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1420px] items-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(470px,590px)_minmax(420px,560px)] lg:gap-12 xl:gap-16">
          <section className="w-full">
            <div className="w-full max-w-[560px] bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-[3.2rem] font-semibold italic leading-none tracking-[-0.12em] text-[#1450b8] sm:text-[3.7rem]">
                    VUX
                  </div>
                </div>
                <div className="mt-1 h-[74px] w-[56px] rounded-[40%_60%_52%_48%/36%_38%_62%_64%] bg-[#1450b8]" />
              </div>

              <div className="mt-14">
                <h1 className="text-[2.15rem] font-semibold tracking-[-0.05em] text-[#0f172a] sm:text-[2.45rem]">Hello!</h1>
                <p className="mt-2 text-[1.02rem] leading-7 text-slate-500">
                  Login to manage your {portalConfig.portalName} Account
                </p>
              </div>

              <form
                className="mt-8 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void login();
                }}
              >
                <Field label="Service ID" htmlFor="portal-identity">
                  <Input
                    id="portal-identity"
                    value={identity}
                    onChange={(event) => setIdentity(event.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    aria-invalid={Boolean(errorMessage)}
                    className="h-[64px] rounded-[0.95rem] border-slate-200 bg-white px-5 text-base text-slate-800 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.18)] placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-[#1450b8]/20"
                  />
                </Field>

                <Field label="Password" htmlFor="portal-password">
                  <div className="flex h-[64px] items-center rounded-[0.95rem] border border-slate-200 bg-white px-5 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.18)]">
                    <Input
                      id="portal-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={Boolean(errorMessage)}
                      className="h-full border-0 bg-transparent px-0 text-base text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="ml-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1450b8]/20"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </Field>

                <div className="flex flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(event) => setKeepSignedIn(event.target.checked)}
                      className="h-5 w-5 rounded border border-slate-300 accent-[#1450b8]"
                    />
                    <span>Keep me signed in</span>
                  </label>

                  <button
                    type="button"
                    className="font-medium text-[#1450b8] underline underline-offset-4"
                    onClick={() => toast.message("Forgot password can be connected to your ISP support flow.")}
                  >
                    Forgot password?
                  </button>
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-[64px] w-full rounded-[0.95rem] bg-[#1450b8] text-lg font-semibold text-white shadow-[0_18px_32px_-20px_rgba(20,80,184,0.45)] transition duration-300 hover:bg-[#0f46a5]"
                >
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-10">
                <div className="h-14 w-20 rounded-[48%_52%_54%_46%/56%_42%_58%_44%] bg-[#e30613]" />

                <div className="mt-8 text-center">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
                    {portalConfig.showPoweredByVux ? "Get The VUX App" : portalConfig.portalName}
                  </p>

                  <div className="mt-6 hidden items-center justify-center gap-4 sm:flex">
                    <AppBadge label="Google Play" />
                    <AppBadge label="App Store" />
                  </div>

                  <p className="mt-6 text-sm text-slate-400">
                    &copy; {new Date().getFullYear()} {portalConfig.portalName}. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="hidden lg:block">
            <div className="mx-auto w-full max-w-[560px]">
              <div className="relative overflow-hidden rounded-[2.35rem] shadow-[0_36px_90px_-40px_rgba(15,23,42,0.28)]">
                <div
                  className="relative min-h-[760px] bg-cover bg-center"
                  style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/8" />
                  <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
                    <div className="max-w-[450px] text-white">
                      <h2 className="text-[2.55rem] font-semibold leading-tight tracking-[-0.06em] xl:text-[2.9rem]">
                        Ultra-Fast Fiber Internet
                      </h2>
                      <p className="mt-4 text-[1rem] leading-8 text-white/85">
                        Experience lightning-fast speeds with our premium fiber-to-home technology. Reliable, consistent,
                        and blazing fast internet for your home and business.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <label htmlFor={htmlFor} className="block text-[1.02rem] font-semibold text-slate-950">
        {label}
      </label>
      {children}
    </div>
  );
}

function AppBadge({ label }: { label: string }) {
  return (
    <div className="min-w-[172px] rounded-full border border-[#d8e2f7] bg-[#eef4ff] px-6 py-4 text-center text-sm font-semibold text-[#1450b8]">
      Get it on {label}
    </div>
  );
}
