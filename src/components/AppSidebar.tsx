import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, BookOpen, Package, TrendingUp, FileText, Settings, LogOut, Shield, Leaf, ExternalLink
} from "lucide-react";

const AppSidebar = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const { seasons, selectedSeason, setSelectedSeasonId } = useSeason();
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile, setOpen, isMobile } = useSidebar();

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const mainNav = [
    { title: t("nav.dashboard"), icon: LayoutDashboard, path: "/" },
    { title: t("nav.seasons"), icon: Leaf, path: "/seasons" },
    { title: t("nav.farmers"), icon: Users, path: "/farmers" },
    { title: t("nav.ledger"), icon: BookOpen, path: "/ledger" },
    { title: t("nav.inventory"), icon: Package, path: "/inventory" },
    { title: t("nav.profitLoss"), icon: TrendingUp, path: "/profit-loss" },
    { title: t("nav.reports"), icon: FileText, path: "/reports" },
  ];

  const adminNav = [
    { title: t("nav.admin"), icon: Shield, path: "/admin" },
    { title: t("nav.settings"), icon: Settings, path: "/settings" },
  ];

  return (
    <Sidebar className="border-r border-[#2A4D3B]/40 bg-[#12281D] text-[#F4EFEA] min-w-0 shadow-2xl">
      {/* Sidebar Header User Card */}
      <SidebarHeader className="border-b border-[#2A4D3B]/30 p-4">
        <div className="flex items-center justify-between gap-3 bg-[#1B3B2B]/60 p-2.5 rounded-2xl border border-[#2A4D3B]/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A4D3B]/60 text-lg font-serif font-bold text-[#E2C391] border border-[#C5A880]/30 shadow-inner">
              {(profile?.full_name || "F").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col truncate min-w-0">
              <span className="text-sm font-semibold text-[#F4EFEA] truncate leading-tight">
                {profile?.full_name || "Fareed Hussain"}
              </span>
              <span className="text-[11px] text-[#A6C0B2] truncate">
                {profile?.email || "user@agriledger.com"}
              </span>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-[#A6C0B2] hover:text-[#E2C391] cursor-pointer transition-colors" />
        </div>

        {/* Season Selector */}
        {seasons.length > 0 && (
          <div className="mt-3">
            <Select value={selectedSeason?.id || ""} onValueChange={(v) => setSelectedSeasonId(v)}>
              <SelectTrigger className="h-9 text-xs bg-[#1B3B2B]/80 border-[#2A4D3B]/60 text-[#F4EFEA] rounded-xl focus:ring-[#C5A880]">
                <Leaf className="h-3.5 w-3.5 mr-1.5 text-[#C5A880]" />
                <SelectValue placeholder={t("seasons.selectSeason")} />
              </SelectTrigger>
              <SelectContent className="bg-[#12281D] border-[#2A4D3B] text-[#F4EFEA]">
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="focus:bg-[#1B3B2B] focus:text-[#E2C391]">
                    {s.name} {s.status === "active" ? "🟢" : "🔒"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="min-h-0 px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {mainNav.map((item, i) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleNav(item.path)}
                      className={`h-11 rounded-2xl px-4 text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? "text-[#F4EFEA] font-semibold border border-[#C5A880]/50 shadow-xl scale-[1.02]"
                          : "text-[#C2D6CB] hover:bg-[#1B3B2B]/50 hover:text-[#F4EFEA]"
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundImage: `linear-gradient(rgba(27, 59, 43, 0.75), rgba(18, 40, 29, 0.85)), url('/images/wood_texture.png')`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      <item.icon
                        className={`h-5 w-5 mr-2.5 transition-transform duration-300 ${
                          isActive ? "text-[#E2C391] scale-110" : "text-[#8CA899]"
                        }`}
                      />
                      <span className="tracking-wide">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {adminNav.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleNav(item.path)}
                        className={`h-11 rounded-2xl px-4 text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                          isActive
                            ? "text-[#F4EFEA] font-semibold border border-[#C5A880]/50 shadow-xl scale-[1.02]"
                            : "text-[#C2D6CB] hover:bg-[#1B3B2B]/50 hover:text-[#F4EFEA]"
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundImage: `linear-gradient(rgba(27, 59, 43, 0.75), rgba(18, 40, 29, 0.85)), url('/images/wood_texture.png')`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        <item.icon
                          className={`h-5 w-5 mr-2.5 ${
                            isActive ? "text-[#E2C391]" : "text-[#8CA899]"
                          }`}
                        />
                        <span className="tracking-wide">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-[#2A4D3B]/30 p-4">
        <div className="flex items-center justify-between gap-3 bg-[#1B3B2B]/40 p-2.5 rounded-2xl border border-[#2A4D3B]/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A4D3B] text-sm font-serif font-bold text-[#E2C391] border border-[#C5A880]/30">
              {(profile?.full_name || "F").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col truncate min-w-0">
              <span className="text-xs font-semibold text-[#F4EFEA] truncate">
                {profile?.full_name || "Fareed Hussain"}
              </span>
              <span className="text-[10px] text-[#A6C0B2] truncate">
                {profile?.email || "user@agriledger.com"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="shrink-0 h-8 w-8 rounded-xl text-[#A6C0B2] hover:text-[#E2C391] hover:bg-[#2A4D3B]/60"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
