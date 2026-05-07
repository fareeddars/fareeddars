import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import NetworkStatusBadge from "@/components/NetworkStatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { dir, language } = useLanguage();
  const { profile, session } = useAuth();
  useAutoLogout(!!session);
  const localeMap: Record<string, string> = { en: "en-US", ur: "ur-PK", sd: "ur-PK" };
  const dateLocale = localeMap[language] || "en-US";

  return (
    <div dir={dir}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <header className="flex h-14 items-center justify-between gap-4 border-b border-border/30 bg-gradient-to-r from-primary via-primary/90 to-accent/80 text-primary-foreground px-4 lg:px-6 sticky top-0 z-10 shadow-lg shadow-primary/15">
              <div className="flex items-center gap-3 min-w-0 flex-1">
              <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-primary-foreground/20 text-primary-foreground transition-colors shrink-0" />
                <div className="hidden sm:block min-w-0">
                  <p className="text-sm font-semibold text-primary-foreground leading-tight truncate max-w-[200px]">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-[11px] text-primary-foreground/70 truncate">
                    {new Date().toLocaleDateString(dateLocale, { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NetworkStatusBadge />
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative hover:bg-primary-foreground/20 text-primary-foreground transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                </Button>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground text-primary font-bold text-sm shadow-md">
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
              </div>
            </header>
            <main className="flex-1 p-3 sm:p-4 lg:p-6 animate-fade-in overflow-x-hidden w-full max-w-full">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AppLayout;
