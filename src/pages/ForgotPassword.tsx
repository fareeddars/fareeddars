import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, ChevronLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const siteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/+$/, "");
      // Include an explicit marker so the app can detect the recovery flow even
      // when Supabase's PKCE flow strips the hash and turns it into `?code=...`.
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/reset-password?type=recovery`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Reset link sent", description: "Check your email for the reset password link." });
    } catch (err: any) {
      toast({ title: "Error sending reset link", description: err.message, variant: "destructive" });
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
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Forgot Password</h1>
            <p className="mt-2 text-sm text-slate-600">Enter your email and we’ll send a reset link.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm font-semibold text-slate-700">Email</Label>
              <div className="relative">
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-900/70" />
              </div>
            </div>
            <Button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-900" disabled={loading || sent}>
              {loading ? "Sending..." : sent ? "Link Sent" : "Send Reset Link"}
              {!loading && !sent ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-slate-600">
            <button type="button" onClick={() => navigate("/auth")} className="inline-flex items-center gap-2 font-semibold text-emerald-800 transition hover:text-emerald-950">
              <ChevronLeft className="h-4 w-4" /> Back to Login
            </button>
            {sent && <p className="text-sm text-slate-700">If the email is registered, you will receive a reset link shortly.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
