import { Link, useLocation } from "wouter";
import { MessageSquare, Users, Building, Share2, BarChart2, Settings, UserCircle, LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/inbox", icon: MessageSquare, label: "Inbox" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/departments", icon: Building, label: "Departments" },
  { href: "/channels", icon: Share2, label: "Channels" },
  { href: "/users", icon: UserCircle, label: "Users" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Narrow Sidebar */}
      <aside className="w-16 flex-shrink-0 border-r bg-sidebar flex flex-col items-center py-4 justify-between z-20">
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl mb-4 shadow-sm">
            O
          </div>
          
          <div className="flex flex-col gap-2 w-full px-2">
            {NAV_ITEMS.map((item) => {
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
              <button className="w-12 h-12 flex items-center justify-center rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors outline-none">
                <LogOut className="w-5 h-5 ml-1" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Sign out
            </TooltipContent>
          </Tooltip>

          <div className="mt-2 w-12 h-12 flex items-center justify-center">
            <Avatar className="w-10 h-10 border border-border cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
