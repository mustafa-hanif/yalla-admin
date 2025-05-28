import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-card/50 backdrop-blur-sm border-muted max-w-lg mx-auto text-center">
        <CardContent className="pt-6">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild>
            <Link to="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
