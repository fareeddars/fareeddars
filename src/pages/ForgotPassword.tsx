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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-border/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Forgot Password</CardTitle>
            <CardDescription>Enter your email and we’ll send a reset link.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="h-11 rounded-xl pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-semibold rounded-xl" disabled={loading || sent}>
                {loading ? "Sending..." : sent ? "Link Sent" : "Send Reset Link"}
              </Button>
            </form>
            <div className="mt-6 text-sm text-center text-muted-foreground space-y-3">
              <button type="button" onClick={() => navigate("/auth")} className="inline-flex items-center gap-2 text-primary hover:underline">
                <ChevronLeft className="h-4 w-4" /> Back to Login
              </button>
              {sent && <p className="text-sm text-foreground">If the email is registered, you will receive a reset link shortly.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
