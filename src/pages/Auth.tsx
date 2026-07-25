import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sprout, Loader2, Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (!isLogin && !fullName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error) throw error;
        navigate(safeNext);
      } else {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin + safeNext },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "You can now sign in." });
        setIsLogin(true);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(135deg,_#f0fdf4_0%,_#ecfeff_45%,_#f0fdfa_100%)] px-2 py-2 text-slate-900 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-center">
        <div className="w-full max-w-full rounded-[28px] border border-white/70 bg-white/85 p-3 shadow-[0_25px_90px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl sm:rounded-[32px] sm:p-6 lg:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
              <Sprout className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:mt-4 sm:text-2xl lg:mt-6 lg:text-3xl">Agriculture Ledger</h1>
            <p className="mt-1 text-sm font-medium text-slate-600 sm:mt-2 sm:text-base">Manage your farm business smartly</p>
          </div>

          <div className="mx-auto mt-4 max-w-md rounded-[22px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] sm:mt-6 sm:p-6 lg:mt-8 lg:p-8">
            <div className="text-center">
              <p className="text-base font-semibold text-slate-900 sm:text-lg">Welcome Back</p>
              <p className="mt-1 text-sm text-slate-600">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-900/70" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete={isLogin ? "username" : "email"}
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 pl-14 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-900/70" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    maxLength={72}
                    className="h-14 w-full rounded-3xl border border-slate-200 bg-slate-50 pl-14 pr-14 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                  >
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950">
                  Forgot Password?
                </button>
              </div>

              <Button type="submit" className="flex w-full items-center justify-center gap-2 rounded-3xl bg-emerald-800 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-900" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <button type="button" className="font-semibold text-emerald-900 underline decoration-emerald-600" onClick={() => setIsLogin(false)}>
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
