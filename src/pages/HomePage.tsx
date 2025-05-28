import { Card, CardContent } from "@/components/ui/card";
import { ImplementationSummary } from "../components/ImplementationSummary";
import logo from "../logo.svg";
import reactLogo from "../react.svg";

export function HomePage() {
  return (
    <div className="text-center space-y-8">
      {/* Hero Section */}
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] scale-120"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] [animation:spin_20s_linear_infinite]"
        />
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-muted max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <h1 className="text-5xl font-bold my-4 leading-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Bun + React + TanStack Query
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            A modern admin dashboard built with cutting-edge technologies
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-4 rounded-lg bg-primary/5 border">
              <h3 className="font-semibold text-primary mb-2">
                ⚡ Bun Runtime
              </h3>
              <p className="text-sm text-muted-foreground">
                Ultra-fast JavaScript runtime with built-in bundling and hot
                reload
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-200">
              <h3 className="font-semibold text-blue-600 mb-2">⚛️ React 19</h3>
              <p className="text-sm text-muted-foreground">
                Latest React with improved performance and developer experience
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-200">
              <h3 className="font-semibold text-green-600 mb-2">
                🔄 TanStack Query
              </h3>
              <p className="text-sm text-muted-foreground">
                Powerful data synchronization for React with caching and
                background updates
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-200">
              <h3 className="font-semibold text-purple-600 mb-2">
                🗄️ DynamoDB
              </h3>
              <p className="text-sm text-muted-foreground">
                NoSQL database with single table design patterns for scalability
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-200">
              <h3 className="font-semibold text-orange-600 mb-2">
                🎨 Tailwind CSS
              </h3>
              <p className="text-sm text-muted-foreground">
                Utility-first CSS framework with shadcn/ui components
              </p>
            </div>
            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-200">
              <h3 className="font-semibold text-rose-600 mb-2">
                🚦 React Router
              </h3>
              <p className="text-sm text-muted-foreground">
                Client-side routing with nested layouts and breadcrumbs
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              Edit{" "}
              <code className="relative rounded bg-background px-[0.3rem] py-[0.2rem] font-mono text-sm border">
                src/pages/HomePage.tsx
              </code>{" "}
              and save to test HMR
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Summary */}
      <ImplementationSummary />
    </div>
  );
}
