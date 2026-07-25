import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

const RECOVERY_FLAG = "pw_recovery_active";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasCode = urlParams.has("code");
        const hasAccessToken = urlParams.has("access_token") || hashParams.has("access_token");
        const isRecoveryType = urlParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
        const hasRecoveryMarker = hasCode || hasAccessToken || isRecoveryType;

        if (hasRecoveryMarker) {
          try { sessionStorage.setItem(RECOVERY_FLAG, "1"); } catch {}
        }

        // Wait up to ~2.5s for Supabase's detectSessionInUrl to finish the
        // implicit-hash pickup OR the PKCE ?code=... exchange.
        let sessionFound = false;
        for (let i = 0; i < 15 && !sessionFound; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) { sessionFound = true; setHasSession(true); break; }
          await new Promise((r) => setTimeout(r, 180));
        }

        if (!sessionFound) {
          if (hasRecoveryMarker) {
            setRecoveryError("The reset link is invalid or has expired. Please request a new password reset link.");
          } else {
            try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {}
            setRecoveryError("This page is only accessible from the reset link sent to your email.");
          }
        }
      } catch (error: any) {
        console.error("[ResetPassword] session check failed:", error);
        setRecoveryError("Unable to validate the reset link. Please try again or request a new link.");
      } finally {
        setSessionReady(true);
      }
    };

    checkRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSession) {
      toast({ title: "Invalid recovery link", description: "Request a new reset link to continue.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Sign in with your new password to continue." });
      try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {}
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast({ title: "Error updating password", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(135deg,_#f0fdf4_0%,_#ecfeff_45%,_#f0fdfa_100%)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4">
      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_25px_90px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl sm:p-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Reset Password</h1>
            <p className="mt-2 text-sm text-slate-600">
              {!sessionReady
                ? "Verifying reset link..."
                : hasSession
                  ? "Set a new password to finish resetting your account."
                  : recoveryError ?? "This page is only accessible from the reset link sent to your email."}
            </p>
          </div>

          <div className="mt-6">
            {!sessionReady ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !hasSession ? (
              <div className="space-y-4 text-center text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
                  <p className="text-sm">Please open the password reset link from your email. If you didn’t receive one, request a new link.</p>
                </div>
                <Button variant="outline" className="h-12 w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => {
                  try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {}
                  navigate("/forgot-password");
                }}>Request new link</Button>
                <Button variant="ghost" className="h-12 w-full rounded-2xl text-slate-700 hover:bg-slate-50" onClick={() => {
                  try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {}
                  navigate("/auth");
                }}>Back to Login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-semibold text-slate-700">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-700">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <Button type="submit" className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-800 font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-900" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
                <Button type="button" variant="ghost" className="h-12 w-full rounded-2xl text-slate-700 hover:bg-slate-50" onClick={async () => {
                  try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {}
                  await supabase.auth.signOut();
                  navigate("/auth", { replace: true });
                }}>Back to Login</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
