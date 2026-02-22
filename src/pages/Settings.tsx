import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
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
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-4 w-4 text-primary" /> {t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.selectLanguage")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-all ${
                  language === lang.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
              >
                {language === lang.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
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
      <Card>
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
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("settings.fullName")} />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? t("settings.saving") : t("settings.saveProfile")}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-4 w-4 text-primary" /> {t("settings.changePassword")}</CardTitle>
          <CardDescription>{t("settings.setNewPassword")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.newPassword")}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.confirmPassword")}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
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
