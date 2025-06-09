import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-auto">
          <div className="w-full max-w-full">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
