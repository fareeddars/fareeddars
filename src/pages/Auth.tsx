import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowRight, Mail, Lock, User, Leaf } from "lucide-react";
import agriLogo from "@/assets/agri-logo.png";


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
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-background px-4 py-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,hsl(var(--primary)/0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative max-h-full w-full max-w-md animate-fade-in overflow-y-auto">
        <div className="mb-3 flex flex-col items-center text-center">
          <img src={agriLogo} alt="Agri Ledger logo" width={512} height={512} className="h-12 w-12 object-contain" />
          <h1 className="mt-1.5 pb-1 font-serif text-2xl font-semibold leading-[1.3] tracking-tight text-foreground">Agri Ledger</h1>
        </div>

        <div className="rounded-lg border border-border bg-card/80 p-5 shadow-xl backdrop-blur sm:p-6">


            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Leaf className="h-3.5 w-3.5" /> {isLogin ? "Welcome back" : "Get started"}
              </span>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {isLogin ? "Sign in to your account" : "Create your account"}
              </h2>
            </div>


            <form onSubmit={handleSubmit} className="space-y-3">
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
                      className="h-11 rounded-xl pl-10"
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
                    className="h-11 rounded-xl pl-10"
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
                    className="h-11 rounded-xl pl-10 pr-11"
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

              <Button type="submit" className="h-11 w-full gap-2 rounded-xl text-base font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Agri Ledger</p>
      </div>
    </div>

  );
};

export default Auth;
