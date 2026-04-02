import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { dir } = useLanguage();
  const { profile } = useAuth();

  return (
    <div dir={dir}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <header className="flex h-14 items-center justify-between gap-4 border-b border-border/30 bg-gradient-to-r from-primary via-primary/90 to-accent/80 text-primary-foreground px-4 lg:px-6 sticky top-0 z-10 shadow-lg shadow-primary/15">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-colors" />
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative hover:bg-primary/10 transition-colors">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                </Button>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/20">
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
              </div>
            </header>
            <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AppLayout;
