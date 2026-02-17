import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, BookOpen, Package, TrendingUp, FileText, Settings, LogOut, Sprout, Shield,
} from "lucide-react";

const AppSidebar = () => {
  const { profile, userRole, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const mainNav = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Farmers", icon: Users, path: "/farmers" },
    { title: "Ledger", icon: BookOpen, path: "/ledger" },
    { title: "Inventory", icon: Package, path: "/inventory" },
    { title: "Profit/Loss", icon: TrendingUp, path: "/profit-loss" },
    { title: "Reports", icon: FileText, path: "/reports" },
  ];

  const adminNav = [
    { title: "Admin Panel", icon: Shield, path: "/admin" },
    { title: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Agriculture Ledger</span>
            <span className="text-xs text-muted-foreground capitalize">{userRole?.role ?? "staff"}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
