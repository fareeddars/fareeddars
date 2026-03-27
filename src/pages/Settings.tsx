import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Lock, Globe, Check } from "lucide-react";
import type { Language } from "@/i18n/translations";

const Settings = () => {
  const { profile, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const languages: { value: Language; label: string; native: string }[] = [
    { value: "en", label: "English", native: "English" },
    { value: "sd", label: "Sindhi", native: "سندھی" },
    { value: "ur", label: "Urdu", native: "اردو" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-chart-3/80 p-6 sm:p-8 text-primary-foreground shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-primary-foreground/10 translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10">
            <SettingsIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">{t("settings.title")}</h1>
            <p className="text-primary-foreground/70 text-sm mt-0.5">{t("settings.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Language */}
      <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="h-1 bg-gradient-to-r from-accent to-chart-5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-4 w-4 text-accent" /> {t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.selectLanguage")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all duration-300 ${
                  language === lang.value
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-accent/5 hover:-translate-y-0.5"
                }`}
              >
                {language === lang.value && (
                  <div className="absolute top-2 right-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <span className="text-lg font-semibold">{lang.native}</span>
                <span className="text-xs text-muted-foreground">{lang.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="h-1 bg-gradient-to-r from-primary to-accent" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><User className="h-4 w-4 text-primary" /> {t("settings.profile")}</CardTitle>
          <CardDescription>{t("settings.updateName")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("admin.email")}</Label>
            <Input value={profile?.email || user?.email || ""} disabled className="bg-muted/20" />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.fullName")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("settings.fullName")} className="h-11" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent">
            {saving ? t("settings.saving") : t("settings.saveProfile")}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="h-1 bg-gradient-to-r from-destructive to-chart-4" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-4 w-4 text-destructive" /> {t("settings.changePassword")}</CardTitle>
          <CardDescription>{t("settings.setNewPassword")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.newPassword")}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.confirmPassword")}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-11" />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPw || !newPassword} className="w-full sm:w-auto">
            {changingPw ? t("settings.changing") : t("settings.changePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
