import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowRight, Mail, Lock, User, Leaf, ShieldCheck, WifiOff, BarChart3 } from "lucide-react";

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

  const highlights = [
    { icon: BarChart3, label: "Season-wise profit & loss" },
    { icon: WifiOff, label: "Works fully offline" },
    { icon: ShieldCheck, label: "Secure farmer records" },
  ];

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] shrink-0 lg:block">
        <img src="/images/hero_farmland.jpg" alt="Farmland at sunrise" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,hsl(var(--primary)/0.92),hsl(var(--primary)/0.72)_45%,hsl(var(--accent)/0.65))]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Agri Ledger logo" className="h-11 w-11 rounded-xl bg-white/15 p-1 backdrop-blur" />
            <div>
              <p className="text-lg font-semibold tracking-tight">Agri Ledger</p>
              <p className="text-xs opacity-80">Farm accounting, simplified</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="max-w-sm font-serif text-4xl leading-tight">Every acre, every rupee — accounted for.</h2>
            <ul className="space-y-3">
              {highlights.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm opacity-90">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs opacity-70">© {new Date().getFullYear()} Agri Ledger</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex h-full flex-1 items-center justify-center overflow-y-auto px-5 py-6 sm:px-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <img src="/favicon.png" alt="Agri Ledger logo" className="h-14 w-14 rounded-2xl shadow-md" />
            <h1 className="mt-3 font-serif text-2xl font-semibold text-foreground">Agri Ledger</h1>
            <p className="text-sm text-muted-foreground">Farm accounting, simplified</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Leaf className="h-3.5 w-3.5" /> {isLogin ? "Welcome back" : "Get started"}
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {isLogin ? "Sign in to your account" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLogin ? "Continue managing your farm ledger." : "Set up your farm ledger in a minute."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      maxLength={80}
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                    className="h-12 rounded-xl pl-10 pr-11"
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" className="h-12 w-full gap-2 rounded-xl text-base font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
