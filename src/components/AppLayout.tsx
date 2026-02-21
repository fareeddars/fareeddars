import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useLanguage } from "@/contexts/LanguageContext";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { dir } = useLanguage();

  return (
    <div dir={dir}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b border-border px-4 lg:px-6">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default AppLayout;
