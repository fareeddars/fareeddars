import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Lock, Globe, Check, Loader2 } from "lucide-react";
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
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto animate-in fade-in duration-700 pb-10">
      {/* --- Premium Header Banner --- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 p-6 sm:p-10 text-white shadow-2xl border border-slate-700/50">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-slate-500/10 -translate-y-1/3 translate-x-1/4 blur-[80px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-gray-500/10 translate-y-1/3 -translate-x-1/4 blur-[50px]" />
        
        <div className="relative z-10 flex flex-col xl:flex-row gap-8 justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-inner shrink-0">
              <SettingsIcon className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-white drop-shadow-sm mb-2">
                {t("settings.title")}
              </h1>
              <p className="text-slate-300/80 text-sm sm:text-base font-medium tracking-wide max-w-lg">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* --- Language Settings --- */}
        <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-serif">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Globe className="h-5 w-5" />
              </div>
              {t("settings.language")}
            </CardTitle>
            <CardDescription className="text-sm ml-[3.25rem]">{t("settings.selectLanguage")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ml-[3.25rem]">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 transition-all duration-300 ${
                    language === lang.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10"
                      : "border-border hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:-translate-y-1 bg-background/50"
                  }`}
                >
                  {language === lang.value && (
                    <div className="absolute top-3 right-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <span className="text-xl font-bold font-serif">{lang.native}</span>
                  <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{lang.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* --- Profile Settings --- */}
        <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-serif">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <User className="h-5 w-5" />
              </div>
              {t("settings.profile")}
            </CardTitle>
            <CardDescription className="text-sm ml-[3.25rem]">{t("settings.updateName")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-5">
            <div className="space-y-4 ml-[3.25rem] max-w-md">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("admin.email")}</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <Input value={profile?.email || user?.email || ""} disabled className="h-12 pl-10 bg-muted/40 font-mono text-muted-foreground opacity-80" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("settings.fullName")}</Label>
                <Input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder={t("settings.fullName")} 
                  className="h-12 bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all" 
                />
              </div>
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving || !fullName.trim()} 
                className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg rounded-xl mt-2 transition-all duration-300"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("settings.saving") || "Saving..."}</> : t("settings.saveProfile")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- Password Settings --- */}
        <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 group mb-10">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-red-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-serif">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Lock className="h-5 w-5" />
              </div>
              {t("settings.changePassword")}
            </CardTitle>
            <CardDescription className="text-sm ml-[3.25rem]">{t("settings.setNewPassword")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-5">
            <div className="space-y-4 ml-[3.25rem] max-w-md">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("settings.newPassword")}</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="h-12 pl-10 bg-background/50 border-border/60 focus:border-rose-500/50 focus:ring-rose-500/20 transition-all font-mono tracking-widest" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("settings.confirmPassword")}</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="h-12 pl-10 bg-background/50 border-border/60 focus:border-rose-500/50 focus:ring-rose-500/20 transition-all font-mono tracking-widest" 
                  />
                </div>
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={changingPw || !newPassword || newPassword !== confirmPassword} 
                className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold shadow-lg rounded-xl mt-2 transition-all duration-300"
              >
                {changingPw ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("settings.changing") || "Changing..."}</> : t("settings.changePassword")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
