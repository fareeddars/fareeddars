import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import NetworkStatusBadge from "@/components/NetworkStatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Globe } from "lucide-react";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { dir, language, setLanguage, t } = useLanguage();
  const { profile, session } = useAuth();
  useAutoLogout(!!session);

  return (
    <div dir={dir} className="h-dvh max-h-dvh overflow-hidden bg-sidebar">
      <SidebarProvider>
        <div className="flex h-full w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-background px-3 sm:px-4 lg:px-8">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 shrink-0 rounded-md border border-border bg-secondary text-foreground transition-colors hover:bg-accent" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Prominent language selector with Globe icon right on the top strip/bar */}
                <div className="flex items-center gap-0.5 rounded-lg border border-primary/30 bg-secondary/90 p-0.5 sm:p-1 text-xs font-medium shadow-xs">
                  <div className="flex items-center px-1 text-primary" title={t("common.language")}>
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    title="English"
                    className={`rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold transition-all ${
                      language === "en"
                        ? "bg-primary font-bold text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("ur")}
                    title="اردو"
                    className={`rounded-md px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold transition-all ${
                      language === "ur"
                        ? "bg-primary font-bold text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    اردو
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("sd")}
                    title="سنڌي"
                    className={`rounded-md px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold transition-all ${
                      language === "sd"
                        ? "bg-primary font-bold text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    سنڌي
                  </button>
                </div>
                <NetworkStatusBadge />
                <div className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground sm:flex">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Critiss</span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-serif font-bold text-primary-foreground">
                  {(profile?.full_name || "F").charAt(0).toUpperCase()}
                </div>
              </div>
            </header>
            <main className="min-h-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AppLayout;
