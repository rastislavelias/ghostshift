'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, LayoutDashboard, Settings2, Command, ChevronRight } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
const navigation = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Projects', href: '/projects', icon: FolderKanban },
  { title: 'Configuration', href: '/configuration', icon: Settings2 },
];
function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const section = navigation.find(item => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
  const closeMenu = () => { if (isMobile) setOpenMobile(false); };
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:p-3 focus:text-primary-foreground">Skip to content</a>
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="py-4">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild tooltip="Ghostshift">
          <Link href="/" onClick={closeMenu}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Command className="size-4" aria-hidden="true" /></span><span className="grid text-left leading-tight"><span className="font-semibold tracking-tight">Ghostshift</span><span className="text-xs text-muted-foreground">Development studio</span></span></Link>
        </SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarHeader>
      <SidebarContent><SidebarGroup><SidebarGroupLabel>Workspace</SidebarGroupLabel><SidebarGroupContent>
        <nav aria-label="Main navigation"><SidebarMenu>{navigation.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={active} tooltip={item.title}>
            <Link href={item.href} onClick={closeMenu} aria-current={active ? 'page' : undefined}><item.icon aria-hidden="true" /><span>{item.title}</span></Link>
          </SidebarMenuButton></SidebarMenuItem>;
        })}</SidebarMenu></nav>
      </SidebarGroupContent></SidebarGroup></SidebarContent>
      <SidebarFooter><div className="px-2 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"><p className="font-medium text-foreground">Human directed</p><p className="mt-1">Ghostshift · v0.1</p></div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <SidebarTrigger className="-ml-1" /><Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
        <span className="hidden text-sm text-muted-foreground sm:inline">Workspace</span><ChevronRight className="hidden size-3 text-muted-foreground sm:block" aria-hidden="true" /><span className="text-sm font-medium">{section?.title || 'Workspace'}</span>
      </header>
      <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</div>
    </SidebarInset>
  </>;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  return <SidebarProvider><Navigation>{children}</Navigation></SidebarProvider>;
}
