import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Home,
  Users,
  Package,
  Database,
  Settings,
  ChevronRight,
} from "lucide-react";

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/users", label: "Users", icon: Users },
    { path: "/products", label: "Products", icon: Package },
    { path: "/api-tester", label: "API Tester", icon: Database },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Home", path: "/" }];

    let currentPath = "";
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const navItem = navItems.find((item) => item.path === currentPath);
      if (navItem) {
        breadcrumbs.push({ label: navItem.label, path: currentPath });
      } else {
        // Capitalize and clean up path for display
        const label = path
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        breadcrumbs.push({ label, path: currentPath });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Yalla Admin 3
                </h1>
              </Link>
            </div>

            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Button
                    key={item.path}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Link to={item.path}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="border-b bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2025 Yalla Admin. Built with Bun + React + TanStack Query.</p>
            <div className="flex items-center gap-4">
              <span>React Router v7</span>
              <span>DynamoDB</span>
              <span>TanStack Query</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
