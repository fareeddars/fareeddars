import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Lock,
  Globe,
  Check,
  Loader2,
  Mail,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  Leaf,
} from "lucide-react";
import type { Language } from "@/i18n/translations";
import SettingsNav, { type SettingsSectionId } from "@/components/settings/SettingsNav";
import SettingsSection from "@/components/settings/SettingsSection";
import { cn } from "@/lib/utils";

const languages: { value: Language; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "sd", label: "Sindhi", native: "سنڌي" },
  { value: "ur", label: "Urdu", native: "اردو" },
];

const passwordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
};

const Settings = () => {
  const { profile, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [section, setSection] = useState<SettingsSectionId>("profile");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated successfully" });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password changed successfully" }); setNewPassword(""); setConfirmPassword(""); }
  };

  const email = profile?.email || user?.email || "";
  const initials = (profile?.full_name || email || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const strength = passwordStrength(newPassword);
  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][strength];
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-5 py-6 sm:px-8 sm:py-8">
        <Leaf
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-primary/5"
        />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("settings.title") || "Settings"}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Manage your account preferences and application settings.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <SettingsNav active={section} onChange={setSection} />
        </div>

        <div className="min-w-0 space-y-6">
          {section === "profile" && (
            <SettingsSection
              icon={User}
              title={t("settings.profile") || "Profile Information"}
              description={t("settings.updateName") || "Update your personal information"}
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div
                  aria-hidden="true"
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
                >
                  {initials}
                </div>
                <div className="w-full min-w-0 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="settings-email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="settings-email"
                        value={email}
                        disabled
                        readOnly
                        className="h-12 rounded-xl bg-muted/50 pl-10 text-base"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-fullname" className="text-sm font-medium">
                      {t("settings.fullName") || "Full Name"}
                    </Label>
                    <div className="relative">
                      <User
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="settings-fullname"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("settings.fullName") || "Full name"}
                        className="h-12 rounded-xl pl-10 text-base"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving || !fullName.trim()}
                      className="h-11 min-h-11 rounded-xl px-6"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> {t("settings.saveProfile") || "Save Profile"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {section === "security" && (
            <SettingsSection
              icon={Lock}
              tone="danger"
              title={t("settings.changePassword") || "Change Password"}
              description={t("settings.setNewPassword") || "Set a new password for your account"}
            >
              <div className="max-w-xl space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    {t("settings.newPassword") || "New Password"}
                  </Label>
                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="h-12 rounded-xl px-10 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? "Hide new password" : "Show new password"}
                      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5" aria-hidden="true">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors",
                              i < strength
                                ? strength <= 1
                                  ? "bg-destructive"
                                  : strength === 2
                                  ? "bg-amber-500"
                                  : "bg-primary"
                                : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password strength: <span className="font-medium">{strengthLabel}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    {t("settings.confirmPassword") || "Confirm New Password"}
                  </Label>
                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={mismatch}
                      aria-describedby={mismatch ? "confirm-password-error" : undefined}
                      className={cn(
                        "h-12 rounded-xl px-10 text-base",
                        mismatch && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mismatch && (
                    <p id="confirm-password-error" className="text-xs font-medium text-destructive">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Use at least 6 characters.
                  </p>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPw || !newPassword || newPassword !== confirmPassword}
                    variant="destructive"
                    className="h-11 min-h-11 rounded-xl px-6"
                  >
                    {changingPw ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" /> Update Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SettingsSection>
          )}

          {section === "language" && (
            <SettingsSection
              icon={Globe}
              title={t("settings.language") || "Language Preferences"}
              description={t("settings.selectLanguage") || "Select your preferred language for the application"}
            >
              <div
                role="radiogroup"
                aria-label="Application language"
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
              >
                {languages.map((lang) => {
                  const selected = language === lang.value;
                  return (
                    <button
                      key={lang.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setLanguage(lang.value)}
                      className={cn(
                        "relative flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-2xl border p-5 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                        </span>
                      )}
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground">
                        {lang.value === "en" ? "En" : lang.native.slice(0, 3)}
                      </span>
                      <span className="text-base font-semibold">{lang.native}</span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {lang.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
