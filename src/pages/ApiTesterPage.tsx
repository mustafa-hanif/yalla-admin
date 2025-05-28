import { Card, CardContent } from "@/components/ui/card";
import { APITester } from "../APITester";

export function ApiTesterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">API Tester</h1>
        <p className="text-muted-foreground text-lg">
          Test the unified DynamoDB API endpoints directly
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-muted">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Legacy API Tester</h2>
            <p className="text-muted-foreground mb-4">
              This tool allows you to test the unified API endpoints directly.
              All endpoints use URL encoding for # characters (e.g., User%231
              instead of User#1).
            </p>
          </div>
          <APITester />
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-muted">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">API Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">
                Available Operations:
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • <code>getItem</code> - Get single item by PK/SK
                </li>
                <li>
                  • <code>query</code> - Query with partition key + patterns
                </li>
                <li>
                  • <code>queryRelated</code> - Query related entities
                </li>
                <li>
                  • <code>queryTimeRange</code> - Query within time range
                </li>
                <li>
                  • <code>queryAll</code> - Get all data for entity
                </li>
                <li>
                  • <code>scan</code> - Table scan (use sparingly!)
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Example URLs:</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>
                  • User Profile:{" "}
                  <code>
                    /api/query?operation=getItem&partitionKey=User%231&sortKey=Profile
                  </code>
                </li>
                <li>
                  • User Products:{" "}
                  <code>
                    /api/query?operation=queryRelated&entityType=User&entityId=1&targetEntity=Product
                  </code>
                </li>
                <li>
                  • All User Data:{" "}
                  <code>
                    /api/query?operation=queryAll&entityType=User&entityId=1
                  </code>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
