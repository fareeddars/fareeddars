import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeason } from "@/contexts/SeasonContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, BookOpen, Package, TrendingUp, FileText, Settings, LogOut, Sprout, Shield, Leaf,
} from "lucide-react";

const AppSidebar = () => {
  const { profile, userRole, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const { seasons, selectedSeason, setSelectedSeasonId } = useSeason();
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
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
    <Sidebar className="border-none">
      <SidebarHeader className="border-b border-sidebar-border/30 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar-primary/20 backdrop-blur-sm shadow-lg">
            <Sprout className="h-6 w-6 text-sidebar-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold text-sidebar-foreground leading-none tracking-tight">{t("nav.appName")}</span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 w-fit capitalize border-sidebar-foreground/30 text-sidebar-foreground/80 bg-sidebar-primary/10">
              {userRole?.role ?? "staff"}
            </Badge>
          </div>
        </div>
        {/* Season Selector */}
        {seasons.length > 0 && (
          <div className="mt-3">
            <Select value={selectedSeason?.id || ""} onValueChange={(v) => setSelectedSeasonId(v)}>
              <SelectTrigger className="h-8 text-xs bg-sidebar-primary/10 border-sidebar-foreground/20 text-sidebar-foreground rounded-lg">
                <Leaf className="h-3 w-3 mr-1" />
                <SelectValue placeholder={t("seasons.selectSeason")} />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.status === "active" ? "🟢" : "🔒"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">{t("nav.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item, i) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => handleNav(item.path)}
                    className="rounded-xl h-10 px-3 transition-all duration-200"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">{t("nav.administration")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => handleNav(item.path)}
                      className="rounded-xl h-10 px-3 transition-all duration-200"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/20 text-sidebar-foreground font-bold text-sm shrink-0">
            {(profile?.full_name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col truncate flex-1 min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">{profile?.full_name || "User"}</span>
            <span className="text-[11px] text-sidebar-foreground/60 truncate">{profile?.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 h-9 w-9 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-primary/20">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
