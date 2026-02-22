import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, BookOpen, Package, TrendingUp, FileText, Settings, LogOut, Sprout, Shield,
} from "lucide-react";

const AppSidebar = () => {
  const { profile, userRole, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const mainNav = [
    { title: t("nav.dashboard"), icon: LayoutDashboard, path: "/" },
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

  const roleBadgeColor: Record<string, string> = {
    admin: "bg-primary/15 text-primary border-primary/30",
    manager: "bg-accent text-accent-foreground border-accent-foreground/30",
    staff: "bg-muted/20 text-muted-foreground border-border",
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-sidebar-foreground leading-none">{t("nav.appName")}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-fit capitalize ${roleBadgeColor[userRole?.role ?? "staff"] || ""}`}>
              {userRole?.role ?? "staff"}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">{t("nav.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={location.pathname === item.path} onClick={() => navigate(item.path)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">{t("nav.administration")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton isActive={location.pathname === item.path} onClick={() => navigate(item.path)}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
            {(profile?.full_name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col truncate flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</span>
            <span className="text-[11px] text-muted-foreground truncate">{profile?.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
