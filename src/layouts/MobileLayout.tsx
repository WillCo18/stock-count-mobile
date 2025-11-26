import { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import { Package, ListChecks, User } from "lucide-react";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
}

/**
 * Mobile-optimized layout wrapper
 * Provides consistent navigation and header across all pages
 */
export function MobileLayout({ children, title }: MobileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold text-foreground">
            {title || "Stock Counter"}
          </h1>
        </div>
      </header>

      {/* Main content area - scrollable */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl p-4">
          {children}
        </div>
      </main>

      {/* Bottom navigation bar - fixed for easy thumb access */}
      <nav className="sticky bottom-0 z-50 border-t border-border bg-card shadow-lg">
        <div className="flex h-16 items-center justify-around">
          <NavLink
            to="/groups"
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
            activeClassName="text-accent font-semibold"
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">Groups</span>
          </NavLink>

          <NavLink
            to="/login"
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
            activeClassName="text-accent font-semibold"
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Login</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
