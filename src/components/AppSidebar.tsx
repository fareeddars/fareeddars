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
    <Sidebar className="min-w-0 border-r border-sidebar-border rtl:border-l rtl:border-r-0 bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-serif font-bold text-primary-foreground">
              {(profile?.full_name || "F").charAt(0).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-col truncate">
              <span className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                {profile?.full_name || "Fareed Hussain"}
              </span>
              <span className="truncate text-[11px] text-sidebar-foreground/60">
                {profile?.email || "user@agriledger.com"}
              </span>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 cursor-pointer text-sidebar-foreground/60 transition-colors hover:text-primary" />
        </div>

        {/* Season Selector */}
        {seasons.length > 0 && (
          <div className="mt-3">
            <Select value={selectedSeason?.id || ""} onValueChange={(v) => setSelectedSeasonId(v)}>
              <SelectTrigger className="h-10 rounded-md border-sidebar-border bg-sidebar-accent/60 text-xs text-sidebar-foreground focus:ring-sidebar-ring">
                <Leaf className="me-1.5 h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder={t("seasons.selectSeason")} />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground">
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

      <SidebarContent className="min-h-0 px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleNav(item.path)}
                      className={`h-11 rounded-md px-3 text-sm transition-colors duration-150 ${
                        isActive
                          ? "bg-primary/15 font-semibold text-sidebar-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className={`me-2.5 h-5 w-5 ${isActive ? "text-primary" : "text-sidebar-foreground/50"}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-3">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminNav.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleNav(item.path)}
                        className={`h-11 rounded-md px-3 text-sm transition-colors duration-150 ${
                          isActive
                            ? "bg-primary/15 font-semibold text-sidebar-foreground"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                      >
                        <item.icon className={`me-2.5 h-5 w-5 ${isActive ? "text-primary" : "text-sidebar-foreground/50"}`} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-serif font-bold text-primary">
              {(profile?.full_name || "F").charAt(0).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-col truncate">
              <span className="truncate text-xs font-semibold text-sidebar-foreground">
                {profile?.full_name || "Fareed Hussain"}
              </span>
              <span className="truncate text-[10px] text-sidebar-foreground/60">
                {profile?.email || "user@agriledger.com"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title={t("nav.logout")}
            aria-label={t("nav.logout")}
            className="h-9 w-9 shrink-0 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>

  );
};

export default AppSidebar;
