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
    // Any visit to /reset-password is considered a recovery attempt — persist
    // the flag so the AuthContext keeps us here after the PKCE code exchange
    // fires a normal SIGNED_IN event.
    try { sessionStorage.setItem(RECOVERY_FLAG, "1"); } catch {}

    const checkRecoverySession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasCode = urlParams.has("code");
        const hasAccessToken = urlParams.has("access_token") || hashParams.has("access_token");
        const isRecoveryType = urlParams.get("type") === "recovery" || hashParams.get("type") === "recovery";

        // Wait up to ~2.5s for Supabase's detectSessionInUrl to finish the
        // implicit-hash pickup OR the PKCE ?code=... exchange.
        let sessionFound = false;
        for (let i = 0; i < 15 && !sessionFound; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) { sessionFound = true; setHasSession(true); break; }
          await new Promise((r) => setTimeout(r, 180));
        }

        if (!sessionFound) {
          if (hasCode || hasAccessToken || isRecoveryType) {
            setRecoveryError("The reset link is invalid or has expired. Please request a new password reset link.");
          } else {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-border/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              {!sessionReady
                ? "Verifying reset link..."
                : hasSession
                  ? "Set a new password to finish resetting your account."
                  : recoveryError ?? "This page is only accessible from the reset link sent to your email."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {!sessionReady ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !hasSession ? (
              <div className="space-y-4 text-center text-muted-foreground">
                <div className="rounded-2xl border border-border/80 bg-muted/80 p-6">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-primary" />
                  <p className="text-sm">Please open the password reset link from your email. If you didn’t receive one, request a new link.</p>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => navigate("/forgot-password")}>Request new link</Button>
                <Button variant="ghost" className="w-full h-12 rounded-xl" onClick={() => navigate("/auth")}>Back to Login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
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
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
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
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full h-12 font-semibold rounded-xl" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
                <Button type="button" variant="ghost" className="w-full h-12 rounded-xl" onClick={async () => {
                  try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {}
                  await supabase.auth.signOut();
                  navigate("/auth", { replace: true });
                }}>Back to Login</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
