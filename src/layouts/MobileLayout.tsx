import { ReactNode } from "react";

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
    </div>
  );
}
