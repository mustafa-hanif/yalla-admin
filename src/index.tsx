/*
Single Table Design Patterns Implemented:

1. Entity Structure:
   - User Profile: PK="User#1", SK="Profile"
   - User Products: PK="User#1", SK="Product#1", SK="Product#2", etc.

2. Access Patterns:
   - Get User Profile: GetItem with PK="User#1", SK="Profile"
   - Get All User Products: Query with PK="User#1", SK begins_with "Product#"
   - Get All User Data: Query with PK="User#1" (gets profile + all products)

3. Query Examples:
   - `/api/users/1` - Gets all data for user 1 (profile + products)
   - `/api/users/1/products` - Gets only products for user 1
   - `/api/products?userId=1&limit=5` - Gets products with pagination

4. Benefits:
   - Single query to get all related data
   - Efficient use of DynamoDB capacity units
   - Scalable for large datasets with pagination
*/

import { serve } from "bun";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetItemCommand } from "dynamodb-toolbox/entity/actions/get";
import { QueryCommand } from "dynamodb-toolbox/table/actions/query";
import { Table } from "dynamodb-toolbox/table";
import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { number } from "dynamodb-toolbox/schema/number";

import index from "./index.html";

/*
Sorting Strategies for Single Table Design:

1. Timestamp-based Sort Keys:
   - SK="Product#2024-05-28T14:30:00Z#productId" (ISO timestamp)
   - SK="Product#20240528143000#productId" (YYYYMMDDHHMMSS)
   - Natural descending order with ScanIndexForward=false

2. Reverse Timestamp (for latest first):
   - Use (9999999999999 - timestamp) for natural ascending = latest first
   - SK="Product#7751471956999#productId"

3. Dedicated Time-Series Pattern:
   - PK="User#1#Products", SK="2024-05-28T14:30:00Z#productId"
   - Separate partition for time-based queries

4. Global Secondary Index (GSI):
   - GSI1PK="ProductsByUser#1", GSI1SK="2024-05-28T14:30:00Z"
   - Enable different access patterns

Recommendation: Use ISO timestamp in SK for simplicity and readability
*/

const client = new DynamoDBClient({
  region: "me-central-1", // or your region
  // Add explicit endpoint for local development if needed
  // endpoint: "http://localhost:8000", // uncomment for DynamoDB Local

  // Add credentials explicitly if not using IAM roles
  // credentials: {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  // },
});

// Test the connection
console.log("DynamoDB client initialized for region:", client.config.region);

const MainTable = new Table({
  // 👇 DynamoDB config.
  name: "main",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  // 👇 Inject the client
  documentClient: DynamoDBDocumentClient.from(client),
});

const UserProfile = new Entity({
  name: "UserProfile",
  table: MainTable,
  schema: item({
    PK: string().key(),
    SK: string().key(),
    name: string(),
  }),
});

const Product = new Entity({
  name: "Product",
  table: MainTable,
  schema: item({
    PK: string().key(),
    SK: string().key(),
    productId: string(),
    name: string(),
    price: number().optional(),
    description: string().optional(),
    createdAt: string(), // ISO timestamp
    updatedAt: string().optional(),
  }),
});

// Alternative Product entity for reverse timestamp approach
const ProductReverse = new Entity({
  name: "ProductReverse",
  table: MainTable,
  schema: item({
    PK: string().key(),
    SK: string().key(), // Format: "Product#{reverseTimestamp}#{productId}"
    productId: string(),
    name: string(),
    price: number().optional(),
    description: string().optional(),
    createdAt: string(),
    updatedAt: string().optional(),
  }),
});

// Helper functions for timestamp handling
function createTimestampSK(productId: string, timestamp?: string): string {
  const ts = timestamp || new Date().toISOString();
  return `Product#${ts}#${productId}`;
}

function createReverseTimestampSK(
  productId: string,
  timestamp?: string
): string {
  const ts = timestamp || new Date().toISOString();
  const reverseTs = (9999999999999 - new Date(ts).getTime())
    .toString()
    .padStart(13, "0");
  return `Product#${reverseTs}#${productId}`;
}

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    // Generic API endpoint for all DynamoDB operations
    "/api/query": async (req) => {
      try {
        const url = new URL(req.url);
        const operation = url.searchParams.get("operation");

        // Generic parameters
        const entityType = url.searchParams.get("entityType"); // e.g., "User", "Product", "Order"
        const entityId = url.searchParams.get("entityId"); // e.g., "1", "user123"
        const targetEntity = url.searchParams.get("targetEntity"); // For related entities, e.g., "Product"

        // Query options
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const startKey = url.searchParams.get("startKey");
        const reverse = url.searchParams.get("reverse") === "true";
        const attributes = url.searchParams.get("attributes")?.split(",");

        // Time-based filtering
        const startTime = url.searchParams.get("startTime");
        const endTime = url.searchParams.get("endTime");

        // Range filtering (URL decode # characters)
        const rangeStart = url.searchParams.get("rangeStart")
          ? decodeURIComponent(url.searchParams.get("rangeStart")!)
          : null;
        const rangeEnd = url.searchParams.get("rangeEnd")
          ? decodeURIComponent(url.searchParams.get("rangeEnd")!)
          : null;
        const rangePrefix = url.searchParams.get("rangePrefix")
          ? decodeURIComponent(url.searchParams.get("rangePrefix")!)
          : null;

        // Custom partition and sort key patterns (URL decode # characters)
        const partitionKey = url.searchParams.get("partitionKey")
          ? decodeURIComponent(url.searchParams.get("partitionKey")!)
          : null;
        const sortKeyPattern = url.searchParams.get("sortKeyPattern")
          ? decodeURIComponent(url.searchParams.get("sortKeyPattern")!)
          : null;

        const time = performance.now();

        switch (operation) {
          case "getItem": {
            // Get a single item by exact PK/SK
            if (!partitionKey) {
              return Response.json(
                { error: "partitionKey is required for getItem operation" },
                { status: 400 }
              );
            }

            const sortKey = url.searchParams.get("sortKey")
              ? decodeURIComponent(url.searchParams.get("sortKey")!)
              : "Profile";

            const command = MainTable.build(QueryCommand)
              .query({
                partition: partitionKey,
                range: { eq: sortKey },
              })
              .options({
                limit: 1,
                ...(attributes && { attributes }),
              });

            const response = await command.send();
            const item = response.Items?.[0] || null;

            console.log(`GetItem query took ${performance.now() - time}ms`);

            return Response.json({
              operation: "getItem",
              partitionKey,
              sortKey,
              data: item,
              found: !!item,
            });
          }

          case "query": {
            // Generic query operation
            if (!partitionKey) {
              return Response.json(
                { error: "partitionKey is required for query operation" },
                { status: 400 }
              );
            }

            let queryBuilder = MainTable.build(QueryCommand)
              .query({
                partition: partitionKey,
                ...(sortKeyPattern && {
                  range: { beginsWith: sortKeyPattern },
                }),
                ...(rangeStart &&
                  rangeEnd && {
                    range: { between: [rangeStart, rangeEnd] },
                  }),
                ...(reverse !== undefined && { reverse }),
              })
              .options({
                limit,
                ...(startKey && {
                  exclusiveStartKey: JSON.parse(decodeURIComponent(startKey)),
                }),
                ...(attributes && { attributes }),
              });

            const response = await queryBuilder.send();
            console.log(`Query took ${performance.now() - time}ms`);

            const result: any = {
              operation: "query",
              partitionKey,
              sortKeyPattern,
              data: response.Items || [],
              count: response.Count || 0,
              scannedCount: response.ScannedCount || 0,
              queryOptions: {
                limit,
                reverse,
                attributes,
                rangeStart,
                rangeEnd,
              },
            };

            if (response.LastEvaluatedKey) {
              result.nextStartKey = encodeURIComponent(
                JSON.stringify(response.LastEvaluatedKey)
              );
            }

            return Response.json(result);
          }

          case "queryRelated": {
            // Query related entities for a parent entity
            if (!entityType || !entityId || !targetEntity) {
              return Response.json(
                {
                  error:
                    "entityType, entityId, and targetEntity are required for queryRelated",
                },
                { status: 400 }
              );
            }

            const pk = `${entityType}#${entityId}`;
            const skPrefix = `${targetEntity}#`;

            let queryBuilder = MainTable.build(QueryCommand)
              .query({
                partition: pk,
                range: { beginsWith: skPrefix },
                ...(reverse !== undefined && { reverse }),
              })
              .options({
                limit,
                ...(startKey && {
                  exclusiveStartKey: JSON.parse(decodeURIComponent(startKey)),
                }),
                ...(attributes && { attributes }),
              });

            const response = await queryBuilder.send();
            console.log(`QueryRelated took ${performance.now() - time}ms`);

            const result: any = {
              operation: "queryRelated",
              entityType,
              entityId,
              targetEntity,
              data: response.Items || [],
              count: response.Count || 0,
              scannedCount: response.ScannedCount || 0,
            };

            if (response.LastEvaluatedKey) {
              result.nextStartKey = encodeURIComponent(
                JSON.stringify(response.LastEvaluatedKey)
              );
            }

            return Response.json(result);
          }

          case "queryTimeRange": {
            // Query entities within a time range
            if (!partitionKey || !startTime || !endTime) {
              return Response.json(
                {
                  error:
                    "partitionKey, startTime, and endTime are required for queryTimeRange",
                },
                { status: 400 }
              );
            }

            const prefix = rangePrefix || "";
            const command = MainTable.build(QueryCommand)
              .query({
                partition: partitionKey,
                range: {
                  between: [`${prefix}${startTime}`, `${prefix}${endTime}`],
                },
              })
              .options({
                limit,
                ...(attributes && { attributes }),
              });

            const response = await command.send();
            console.log(`Time range query took ${performance.now() - time}ms`);

            return Response.json({
              operation: "queryTimeRange",
              partitionKey,
              timeRange: { startTime, endTime },
              rangePrefix,
              data: response.Items || [],
              count: response.Count || 0,
            });
          }

          case "queryAll": {
            // Get all items for an entity (e.g., profile + all related entities)
            if (!entityType || !entityId) {
              return Response.json(
                { error: "entityType and entityId are required for queryAll" },
                { status: 400 }
              );
            }

            const pk = `${entityType}#${entityId}`;
            const command = MainTable.build(QueryCommand)
              .query({
                partition: pk,
                ...(reverse !== undefined && { reverse }),
              })
              .options({
                limit,
                ...(attributes && { attributes }),
              });

            const response = await command.send();
            console.log(`QueryAll took ${performance.now() - time}ms`);

            // Group items by entity type for easier frontend consumption
            const groupedData: Record<string, any[]> = {};
            const profile = response.Items?.find(
              (item) => item.SK === "Profile"
            );

            response.Items?.forEach((item) => {
              if (item.SK === "Profile") return; // Handle profile separately

              const skParts = (item.SK as string).split("#");
              const entityType = skParts[0];

              if (!groupedData[entityType]) {
                groupedData[entityType] = [];
              }
              groupedData[entityType].push(item);
            });

            return Response.json({
              operation: "queryAll",
              entityType,
              entityId,
              data: {
                profile,
                related: groupedData,
                raw: response.Items || [],
              },
              count: response.Count || 0,
              totalItems: response.Count || 0,
            });
          }

          case "scan": {
            // Generic scan operation (use sparingly!)
            const filterExpression = url.searchParams.get("filterExpression");
            const { ScanCommand } = await import(
              "dynamodb-toolbox/table/actions/scan"
            );

            let scanBuilder = MainTable.build(ScanCommand).options({
              limit,
              ...(startKey && {
                exclusiveStartKey: JSON.parse(decodeURIComponent(startKey)),
              }),
              ...(attributes && { attributes }),
            });

            const response = await scanBuilder.send();
            console.log(`Scan took ${performance.now() - time}ms`);

            const result: any = {
              operation: "scan",
              data: response.Items || [],
              count: response.Count || 0,
              scannedCount: response.ScannedCount || 0,
              warning:
                "Scan operations are expensive - use query when possible",
            };

            if (response.LastEvaluatedKey) {
              result.nextStartKey = encodeURIComponent(
                JSON.stringify(response.LastEvaluatedKey)
              );
            }

            return Response.json(result);
          }

          default:
            return Response.json(
              {
                error: "Invalid operation",
                supportedOperations: {
                  getItem: "Get single item by PK/SK",
                  query:
                    "Query items with partition key and optional range conditions",
                  queryRelated: "Query related entities for a parent entity",
                  queryTimeRange: "Query items within a time range",
                  queryAll: "Get all items for an entity (profile + related)",
                  scan: "Scan table (use sparingly!)",
                },
                parameters: {
                  required: ["operation"],
                  optional: [
                    "entityType",
                    "entityId",
                    "targetEntity",
                    "partitionKey",
                    "sortKey",
                    "sortKeyPattern",
                    "limit",
                    "startKey",
                    "reverse",
                    "attributes",
                    "startTime",
                    "endTime",
                    "rangeStart",
                    "rangeEnd",
                    "rangePrefix",
                  ],
                },
              },
              { status: 400 }
            );
        }
      } catch (error) {
        console.error("Query error:", error);
        return Response.json(
          {
            error: "Failed to execute query",
            details: error.message,
            operation:
              new URL(req.url).searchParams.get("operation") || "unknown",
          },
          { status: 500 }
        );
      }
    },

    // Create test data endpoint
    "/api/seed": {
      async POST(req) {
        try {
          // Import PutItemCommand for creating items
          const { PutItemCommand } = await import(
            "dynamodb-toolbox/entity/actions/put"
          );

          // Create a user profile
          const profileCommand = UserProfile.build(PutItemCommand).item({
            PK: "User#1",
            SK: "Profile",
            name: "John Doe",
          });

          // Create some products for the user with timestamp-based sort keys
          const now = new Date();
          const timestamp1 = new Date(now.getTime() - 3600000).toISOString(); // 1 hour ago
          const timestamp2 = new Date(now.getTime() - 1800000).toISOString(); // 30 min ago
          const timestamp3 = new Date().toISOString(); // now

          const product1Command = Product.build(PutItemCommand).item({
            PK: "User#1",
            SK: createTimestampSK("1", timestamp1), // "Product#2024-05-28T13:30:00Z#1"
            productId: "1",
            name: "Laptop",
            price: 999.99,
            description: "High-performance laptop",
            createdAt: timestamp1,
          });

          const product2Command = Product.build(PutItemCommand).item({
            PK: "User#1",
            SK: createTimestampSK("2", timestamp2), // "Product#2024-05-28T14:00:00Z#2"
            productId: "2",
            name: "Mouse",
            price: 29.99,
            description: "Wireless mouse",
            createdAt: timestamp2,
          });

          // Create product with reverse timestamp for latest-first sorting
          const product3Command = ProductReverse.build(PutItemCommand).item({
            PK: "User#1",
            SK: createReverseTimestampSK("3", timestamp3), // "Product#7751471956999#3"
            productId: "3",
            name: "Keyboard",
            price: 79.99,
            description: "Mechanical keyboard",
            createdAt: timestamp3,
          });

          // Execute all commands
          await Promise.all([
            profileCommand.send(),
            product1Command.send(),
            product2Command.send(),
            product3Command.send(),
          ]);

          return Response.json({
            message: "Test data created successfully",
            created: {
              profile: "User#1 Profile",
              products: [
                `User#1 ${createTimestampSK("1", timestamp1)}`,
                `User#1 ${createTimestampSK("2", timestamp2)}`,
                `User#1 ${createReverseTimestampSK("3", timestamp3)}`,
              ],
            },
            timestamps: {
              product1: timestamp1,
              product2: timestamp2,
              product3: timestamp3,
            },
          });
        } catch (error) {
          console.error("Seed error:", error);
          return Response.json(
            {
              error: "Failed to create test data",
              details: error.message,
            },
            { status: 500 }
          );
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

/*
Generic Single Table Design API:

Single endpoint: GET /api/query

This API is designed to work with any entity type and relationship pattern in a single DynamoDB table.

⚠️ **Important**: When using # characters in URL parameters, they must be URL-encoded as %23

Core Parameters:
- operation (required): Type of query operation
- entityType: The main entity type (e.g., "User", "Order", "Product")
- entityId: The specific entity identifier
- targetEntity: For related queries, the type of related entity to fetch

Query Options:
- limit: Maximum number of items to return (default: 10)
- startKey: For pagination (URL-encoded JSON)
- reverse: true/false for sort order
- attributes: Comma-separated list of attributes to return

Range/Filter Options:
- partitionKey: Custom partition key for direct queries (URL-encode # as %23)
- sortKey: Exact sort key for getItem operations (URL-encode # as %23)
- sortKeyPattern: Prefix pattern for range queries (URL-encode # as %23)
- rangeStart/rangeEnd: Custom range boundaries (URL-encode # as %23)
- rangePrefix: Prefix for time-based ranges (URL-encode # as %23)
- startTime/endTime: ISO timestamps for time range queries

Operations:

1. **getItem**: Get single item by exact PK/SK
   GET /api/query?operation=getItem&partitionKey=User%231&sortKey=Profile
   GET /api/query?operation=getItem&partitionKey=Order%23123&sortKey=Details

2. **query**: Generic query with flexible range conditions
   GET /api/query?operation=query&partitionKey=User%231&sortKeyPattern=Product%23
   GET /api/query?operation=query&partitionKey=User%231&rangeStart=Product%232024-01-01&rangeEnd=Product%232024-12-31
   GET /api/query?operation=query&partitionKey=Store%235&sortKeyPattern=Order%23&reverse=true&limit=20

3. **queryRelated**: Query related entities for a parent
   GET /api/query?operation=queryRelated&entityType=User&entityId=1&targetEntity=Product
   GET /api/query?operation=queryRelated&entityType=Order&entityId=123&targetEntity=Item
   GET /api/query?operation=queryRelated&entityType=Customer&entityId=456&targetEntity=Invoice&limit=5&reverse=true

4. **queryTimeRange**: Query within time boundaries
   GET /api/query?operation=queryTimeRange&partitionKey=User%231&startTime=2024-05-01T00:00:00Z&endTime=2024-05-31T23:59:59Z&rangePrefix=Product%23
   GET /api/query?operation=queryTimeRange&partitionKey=Store%235&startTime=2024-05-28T00:00:00Z&endTime=2024-05-28T23:59:59Z&rangePrefix=Sale%23

5. **queryAll**: Get all data for an entity (profile + all related)
   GET /api/query?operation=queryAll&entityType=User&entityId=1
   GET /api/query?operation=queryAll&entityType=Order&entityId=123&attributes=orderId,status,total

6. **scan**: Table scan (use sparingly!)
   GET /api/query?operation=scan&limit=100&attributes=PK,SK,name

Multi-Entity Examples:

User Management:
- Profile: /api/query?operation=getItem&partitionKey=User%231&sortKey=Profile
- Products: /api/query?operation=queryRelated&entityType=User&entityId=1&targetEntity=Product
- Orders: /api/query?operation=queryRelated&entityType=User&entityId=1&targetEntity=Order
- All User Data: /api/query?operation=queryAll&entityType=User&entityId=1

E-commerce:
- Order Details: /api/query?operation=getItem&partitionKey=Order%23123&sortKey=Details
- Order Items: /api/query?operation=queryRelated&entityType=Order&entityId=123&targetEntity=Item
- Customer Orders: /api/query?operation=queryRelated&entityType=Customer&entityId=456&targetEntity=Order
- Recent Orders: /api/query?operation=query&partitionKey=Store%231&sortKeyPattern=Order%23&reverse=true&limit=10

Inventory:
- Product Info: /api/query?operation=getItem&partitionKey=Product%23ABC123&sortKey=Details
- Product Reviews: /api/query?operation=queryRelated&entityType=Product&entityId=ABC123&targetEntity=Review
- Category Products: /api/query?operation=query&partitionKey=Category%23Electronics&sortKeyPattern=Product%23

Analytics:
- Daily Sales: /api/query?operation=queryTimeRange&partitionKey=Store%231&startTime=2024-05-28T00:00:00Z&endTime=2024-05-28T23:59:59Z&rangePrefix=Sale%23
- User Activity: /api/query?operation=queryTimeRange&partitionKey=User%231&startTime=2024-05-01T00:00:00Z&endTime=2024-05-31T23:59:59Z&rangePrefix=Activity%23

Response Format:
```json
{
  "operation": "operation_name",
  "data": "result_data",
  "count": "number_of_items",
  "partitionKey": "used_partition_key",
  "entityType": "entity_type",
  "entityId": "entity_id",
  "nextStartKey": "pagination_token",
  "queryOptions": {
    "limit": 10,
    "reverse": false,
    "attributes": ["attr1", "attr2"]
  }
}
```

Error Responses:
- 400: Invalid operation or missing required parameters
- 500: DynamoDB or server errors

Benefits:
- **Entity Agnostic**: Works with any entity type (User, Order, Product, etc.)
- **Flexible Queries**: Supports various access patterns
- **Extensible**: Easy to add new entity types without code changes
- **Performance**: Leverages DynamoDB's query capabilities
- **Consistent**: Same API for all entity operations
- **Scalable**: Supports pagination for large datasets

Frontend Usage Patterns:

```javascript
// Helper function to properly encode partition keys
const encodeKey = (key) => encodeURIComponent(key);

// Generic entity operations
const getEntity = (type, id) => 
  fetch(`/api/query?operation=getItem&partitionKey=${encodeKey(type + '#' + id)}&sortKey=Profile`);

const getRelatedEntities = (type, id, targetType, options = {}) => {
  const params = new URLSearchParams({
    operation: 'queryRelated',
    entityType: type,
    entityId: id,
    targetEntity: targetType,
    ...options
  });
  return fetch(`/api/query?${params}`);
};

const queryWithPattern = (partitionKey, sortKeyPattern, options = {}) => {
  const params = new URLSearchParams({
    operation: 'query',
    partitionKey: encodeKey(partitionKey),
    sortKeyPattern: encodeKey(sortKeyPattern),
    ...options
  });
  return fetch(`/api/query?${params}`);
};

const getAllEntityData = (type, id) =>
  fetch(`/api/query?operation=queryAll&entityType=${type}&entityId=${id}`);

// Usage examples
const userProfile = await getEntity('User', '1');
const userProducts = await getRelatedEntities('User', '1', 'Product', { limit: 5, reverse: true });
const orderItems = await getRelatedEntities('Order', '123', 'Item');
const categoryProducts = await queryWithPattern('Category#Electronics', 'Product#');
const allUserData = await getAllEntityData('User', '1');
```

URL Encoding Reference:
- # becomes %23
- User#1 becomes User%231
- Product#2024-05-28 becomes Product%232024-05-28

This generic design allows you to easily add new entity types (Customer, Invoice, Category, etc.) 
without modifying the API code - just follow the PK/SK naming conventions and proper URL encoding!
*/

console.log(`🚀 Server running at ${server.url}`);
