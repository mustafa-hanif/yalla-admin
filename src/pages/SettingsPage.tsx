import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [cacheStats, setCacheStats] = useState<any>(null);

  const handleClearCache = () => {
    queryClient.clear();
    alert("Query cache cleared!");
  };

  const handleInvalidateAll = () => {
    queryClient.invalidateQueries();
    alert("All queries invalidated!");
  };

  const handleGetCacheStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    setCacheStats({
      totalQueries: queries.length,
      staleQueries: queries.filter((q) => q.isStale()).length,
      activeQueries: queries.filter((q) => q.observers.length > 0).length,
      queries: queries.map((q) => ({
        queryKey: q.queryKey,
        state: q.state.status,
        dataUpdatedAt: q.state.dataUpdatedAt,
        isStale: q.isStale(),
        observers: q.observers.length,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Application configuration and cache management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Query Cache Management */}
        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardHeader>
            <CardTitle>TanStack Query Cache</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button onClick={handleGetCacheStats} variant="outline">
                Get Cache Stats
              </Button>
              <Button onClick={handleInvalidateAll} variant="outline">
                Invalidate All Queries
              </Button>
              <Button onClick={handleClearCache} variant="destructive">
                Clear Cache
              </Button>
            </div>

            {cacheStats && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Cache Statistics</h4>
                <div className="text-sm space-y-1">
                  <p>Total Queries: {cacheStats.totalQueries}</p>
                  <p>Active Queries: {cacheStats.activeQueries}</p>
                  <p>Stale Queries: {cacheStats.staleQueries}</p>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Query Details
                  </summary>
                  <pre className="text-xs mt-2 p-2 bg-background rounded overflow-auto max-h-60">
                    {JSON.stringify(cacheStats.queries, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input
                id="api-endpoint"
                value="/api/query"
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-limit">Default Query Limit</Label>
              <Input
                id="default-limit"
                type="number"
                defaultValue="10"
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cache-time">Cache Time (minutes)</Label>
              <Input
                id="cache-time"
                type="number"
                defaultValue="5"
                placeholder="5"
              />
            </div>
            <Button className="w-full" disabled>
              Save Configuration (Demo)
            </Button>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Runtime</p>
                <p className="text-muted-foreground">Bun</p>
              </div>
              <div>
                <p className="font-semibold">Framework</p>
                <p className="text-muted-foreground">React 19</p>
              </div>
              <div>
                <p className="font-semibold">Routing</p>
                <p className="text-muted-foreground">React Router v7</p>
              </div>
              <div>
                <p className="font-semibold">State Management</p>
                <p className="text-muted-foreground">TanStack Query v5</p>
              </div>
              <div>
                <p className="font-semibold">Database</p>
                <p className="text-muted-foreground">DynamoDB</p>
              </div>
              <div>
                <p className="font-semibold">UI Library</p>
                <p className="text-muted-foreground">shadcn/ui</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Tools */}
        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardHeader>
            <CardTitle>Development Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                <strong>React Query DevTools:</strong> Press F12 to open browser
                DevTools, then click the TanStack Query panel for detailed query
                inspection.
              </p>
              <p className="text-sm">
                <strong>Hot Reload:</strong> File changes are automatically
                reflected in the browser.
              </p>
              <p className="text-sm">
                <strong>TypeScript:</strong> Full type safety with real-time
                error checking.
              </p>
            </div>
            <Button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open(
                    "https://tanstack.com/query/latest/docs/framework/react/devtools",
                    "_blank"
                  );
                }
              }}
              variant="outline"
              className="w-full"
            >
              Open TanStack Query Docs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
