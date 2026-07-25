import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import NetworkStatusBadge from "@/components/NetworkStatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { dir } = useLanguage();
  const { profile, session } = useAuth();
  useAutoLogout(!!session);

  return (
    <div dir={dir} className="h-dvh max-h-dvh overflow-hidden bg-[#12281D]">
      <SidebarProvider>
        <div className="flex h-full w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F4EFEA]">
            {/* Top Bar Header matching screenshot layout */}
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 bg-[#F4EFEA] px-4 lg:px-8 border-b border-[#E2D8CD]">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl border border-[#2A4D3B]/20 bg-[#1B3B2B]/10 text-[#1B3B2B] hover:bg-[#1B3B2B]/20 transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <NetworkStatusBadge />
                <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#1B3B2B]/10 border border-[#1B3B2B]/20 px-3 py-1 text-xs font-medium text-[#1B3B2B]">
                  <Zap className="h-3.5 w-3.5 text-[#2A6E49]" />
                  <span>Critiss</span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C5A880]/40 border border-[#8C6D46]/40 text-sm font-serif font-bold text-[#1B3B2B] shadow-sm">
                  {(profile?.full_name || "F").charAt(0).toUpperCase()}
                </div>
              </div>
            </header>
            <main className="flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden bg-[#F4EFEA] p-4 sm:p-6 lg:p-8 animate-fade-in">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AppLayout;
