import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Users, Building, Share2, BarChart2, Send, FileText, Settings, UserCircle, LogOut, Menu, X, Mail, MessageCircle, Bot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { canAccessAdminFeatures } from "@/lib/permissions";

const NAV_ITEMS = [
  { href: "/inbox", icon: MessageSquare, label: "Inbox" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/departments", icon: Building, label: "Depts", adminOnly: true },
  { href: "/channels", icon: Share2, label: "Channels", adminOnly: true },
  { href: "/users", icon: UserCircle, label: "Users", adminOnly: true },
  { href: "/auto-reply", icon: MessageCircle, label: "Auto Reply", adminOnly: true },
  { href: "/ai-agents", icon: Bot, label: "AI Agents", adminOnly: true },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/whatsapp-blasts", icon: Send, label: "WA Blast" },
  { href: "/whatsapp-templates", icon: FileText, label: "WA Templates" },
  { href: "/api-outbox", icon: Mail, label: "API Outbox" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hasAdminAccess = canAccessAdminFeatures(user);
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || hasAdminAccess);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-16 flex-shrink-0 border-r bg-sidebar flex-col items-center py-4 justify-between z-20">
        <div className="flex flex-col items-center gap-4 w-full">
          <Link href="/">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl mb-4 shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
              O
            </div>
          </Link>

          <div className="flex flex-col gap-2 w-full px-2">
            {visibleNavItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} className="block">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full px-2 mt-auto">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href="/settings" className="block">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${location.startsWith("/settings") ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                  <Settings className="w-5 h-5" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Settings
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="w-12 h-12 flex items-center justify-center rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors outline-none cursor-pointer"
              >
                <LogOut className="w-5 h-5 ml-1" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Sign out
            </TooltipContent>
          </Tooltip>

          <div className="mt-2 w-12 h-12 flex items-center justify-center">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Avatar className="w-10 h-10 border border-border cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? "Profile"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                    {user?.initials ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {user?.name ?? "Unknown"} · {user?.role}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b z-30 flex items-center justify-between px-4">
        <Link href="/">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer">
            O
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-sidebar-foreground/70">{user?.name ?? "?"}</span>
          <button onClick={() => setMobileMenuOpen(true)} className="w-8 h-8 flex items-center justify-center">
            <Menu className="w-5 h-5 text-sidebar-foreground" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-sidebar border-l shadow-xl flex flex-col p-4 gap-1" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sidebar-foreground">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center">
                <X className="w-5 h-5 text-sidebar-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? "Profile"} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                  {user?.initials ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user?.name ?? "Unknown"}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
              </div>
            </div>
            {visibleNavItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className="block" onClick={() => setMobileMenuOpen(false)}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
            <Link href="/settings" className="block mt-1" onClick={() => setMobileMenuOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.startsWith("/settings") ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </div>
            </Link>
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 mt-auto mb-2">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden relative md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
