import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setSessionReady(true);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
              {sessionReady
                ? hasSession
                  ? "Set a new password to finish resetting your account."
                  : "This page is only accessible from the reset link sent to your email."
                : "Checking reset session..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {sessionReady && !hasSession ? (
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
                      placeholder="••••••••"
                      required
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((state) => !state)}
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
                    placeholder="••••••••"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{showPassword ? "Hiding" : "Showing"} password text</span>
                  <button type="button" onClick={() => setShowPassword((state) => !state)} className="font-medium text-primary hover:underline">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Button type="submit" className="w-full h-12 font-semibold rounded-xl" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
                <Button variant="ghost" className="w-full h-12 rounded-xl" onClick={() => navigate("/auth")}>Back to Login</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
