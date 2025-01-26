import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import {
  BookOpen,
  GraduationCap,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const navigation = [
    { name: "My Courses", href: "/", icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-64 flex-col bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-4 py-6">
          <GraduationCap className="h-8 w-8 text-sidebar-primary" />
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            AI Tutor
          </h1>
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="flex flex-1 flex-col gap-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 pb-2">
            <Avatar>
              <AvatarFallback>
                {user?.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground">
                {user?.username}
              </p>
              <p className="text-xs text-sidebar-foreground/60">Student</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto py-6">{children}</div>
      </main>
    </div>
  );
}
