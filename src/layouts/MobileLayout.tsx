import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
}

/**
 * Mobile-optimized layout wrapper
 * Provides consistent navigation and header across all pages
 */
export function MobileLayout({ children, title }: MobileLayoutProps) {
  const location = useLocation();
  const { staffName } = useStaff();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/groups", label: "Counting Groups" },
    { path: "/finalize", label: "Final Stock" },
    ...(staffName === "Simon" ? [{ path: "/clear", label: "Clear Counts" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold text-foreground">
            {title || "Stock Counter"}
          </h1>
        </div>
        
        {/* Navigation Bar */}
        {staffName && (
          <nav className="border-t border-border bg-card">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const isActive = 
                  item.path === "/" 
                    ? location.pathname === "/"
                    : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex-1 px-3 py-3 text-center text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main content area - scrollable */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
