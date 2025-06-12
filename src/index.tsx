/*
SQL Database Design (migrated from DynamoDB single-table design):

1. Entity Structure:
   - Users table: Stores user profiles
   - Products table: Stores user products with foreign key to               const result = await sql`
                SELECT *, data as json_data FR              const itemResults = await sql`
                SELECT *, data as json_data FROM items 
                WHERE pk = ${partitionKey}
                ${sortKeyPattern ? sql`AND sk LIKE ${sortKeyPattern + "%"}` : sql``}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;

              // Handle JSONB data for generic items
              const parsedItems = itemResults
                .map((item) => ({
                  ...item,
                  ...(item.json_data || {}),
                }))
                .map((item) => {
                  delete item.data;
                  delete item.json_data;
                  return item;
                }));        WHERE pk = ${partitionKey} AND sk = ${sortKey}
                LIMIT 1
              `;
              if (result[0]) {
                item = { ...result[0], ...(result[0].json_data || {}) };
                delete item.data;
                delete item.json_data;
              }- Generic Items table: For flexible entity storage (maintains DynamoDB compatibility)

2. Access Patterns:
   - Get User Profile: SELECT from users table
   - Get All User Products: SELECT from products table with user_id filter
   - Get All User Data: JOIN users and products tables

3. Query Examples:
   - `/api/users/1` - Gets all data for user 1 (profile + products)
   - `/api/users/1/products` - Gets only products for user 1
   - `/api/products?userId=1&limit=5` - Gets products with pagination

4. Benefits:
   - Relational data integrity
   - Standard SQL operations
   - Efficient indexing and querying
*/

import { serve, sql } from "bun";

import index from "./index.html";
import { searchAmazon } from "./amazon-scraper";

// Database initialization
const initDatabase = async () => {
  try {
    console.log("Starting database initialization...");

    // Drop existing tables if they exist (for clean slate)
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS products CASCADE`;
    await sql`DROP TABLE IF EXISTS items CASCADE`;
    console.log("Dropped existing tables");

    // Create users table
    await sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        pk TEXT NOT NULL,
        sk TEXT NOT NULL,
        name TEXT,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pk, sk)
      )
    `;
    console.log("Created users table");

    // Create products table
    await sql`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        pk TEXT NOT NULL,
        sk TEXT NOT NULL,
        product_id TEXT,
        name TEXT,
        price DECIMAL(10,2),
        description TEXT,
        created_at TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pk, sk)
      )
    `;
    console.log("Created products table");

    // Create generic items table (for DynamoDB compatibility)
    await sql`
      CREATE TABLE items (
        id SERIAL PRIMARY KEY,
        pk TEXT NOT NULL,
        sk TEXT NOT NULL,
        entity_type TEXT,
        data JSONB, -- JSON data
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pk, sk)
      )
    `;
    console.log("Created items table");

    // Create indexes for better performance
    await sql`CREATE INDEX idx_users_pk ON users(pk)`;
    await sql`CREATE INDEX idx_users_sk ON users(sk)`;
    await sql`CREATE INDEX idx_products_pk ON products(pk)`;
    await sql`CREATE INDEX idx_products_sk ON products(sk)`;
    await sql`CREATE INDEX idx_items_pk ON items(pk)`;
    await sql`CREATE INDEX idx_items_sk ON items(sk)`;
    await sql`CREATE INDEX idx_items_entity_type ON items(entity_type)`;
    console.log("Created indexes");

    // Test query to verify tables exist
    const testResult = await sql`SELECT COUNT(*) as count FROM users`;
    console.log("Database test query successful:", testResult[0]);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error; // Re-throw to stop server startup if DB init fails
  }
};

// Helper functions for timestamp-based sort keys (DynamoDB compatibility)
const createTimestampSK = (id: string, timestamp: string) => {
  return `Product#${timestamp}#${id}`;
};

const createReverseTimestampSK = (id: string, timestamp: string) => {
  // Create reverse timestamp for latest-first sorting
  const reverseTimestamp = (
    999999999999999 - new Date(timestamp).getTime()
  ).toString();
  return `Product#${reverseTimestamp}#${id}`;
};

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database first
    await initDatabase();

    // Then start the server
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

            const perfTracker = createPerformanceTracker();

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

                perfTracker.startProcessing();

                // Query from appropriate table based on sort key
                let item = null;

                perfTracker.startDbQuery();
                if (sortKey === "Profile") {
                  // User profile from users table
                  const result = await sql`
                SELECT * FROM users 
                WHERE pk = ${partitionKey} AND sk = ${sortKey}
                LIMIT 1
              `;
                  item = result[0] || null;
                } else if (sortKey.startsWith("Product#")) {
                  // Product from products table
                  const result = await sql`
                SELECT * FROM products 
                WHERE pk = ${partitionKey} AND sk = ${sortKey}
                LIMIT 1
              `;
                  item = result[0] || null;
                } else {
                  // Generic item from items table
                  const result = await sql`
                SELECT *, data as json_data FROM items 
                WHERE pk = ${partitionKey} AND sk = ${sortKey}
                LIMIT 1
              `;
                  if (result[0]) {
                    item = { ...result[0], ...(result[0].json_data || {}) };
                    delete item.data;
                    delete item.json_data;
                  }
                }
                perfTracker.endDbQuery();
                perfTracker.endProcessing();

                perfTracker.startSerialization();
                const responseData = {
                  operation: "getItem",
                  partitionKey,
                  sortKey,
                  data: item,
                  found: !!item,
                };
                perfTracker.endSerialization();

                const metrics = perfTracker.finish();
                return createTimedResponse(responseData, metrics, "getItem");
              }

              case "query": {
                // Generic query operation
                if (!partitionKey) {
                  return Response.json(
                    { error: "partitionKey is required for query operation" },
                    { status: 400 }
                  );
                }

                // Build SQL query based on parameters
                let whereClause = `pk = ${partitionKey}`;
                const params: any[] = [];

                if (sortKeyPattern) {
                  whereClause += ` AND sk LIKE ?`;
                  params.push(`${sortKeyPattern}%`);
                }

                if (rangeStart && rangeEnd) {
                  whereClause += ` AND sk BETWEEN ? AND ?`;
                  params.push(rangeStart, rangeEnd);
                }

                // Determine which table(s) to query
                let results: any[] = [];

                if (!sortKeyPattern || sortKeyPattern === "Profile") {
                  // Query users table
                  const userResults = await sql`
                SELECT * FROM users 
                WHERE pk = ${partitionKey}
                ${sortKeyPattern ? sql`AND sk LIKE ${sortKeyPattern + "%"}` : sql``}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;
                  results.push(...userResults);
                }

                if (!sortKeyPattern || sortKeyPattern.startsWith("Product")) {
                  // Query products table
                  const productResults = await sql`
                SELECT * FROM products 
                WHERE pk = ${partitionKey}
                ${sortKeyPattern ? sql`AND sk LIKE ${sortKeyPattern + "%"}` : sql`AND sk LIKE 'Product#%'`}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;
                  results.push(...productResults);
                }

                // Query generic items table if needed
                if (
                  !sortKeyPattern ||
                  (!sortKeyPattern.startsWith("Product") &&
                    sortKeyPattern !== "Profile")
                ) {
                  const itemResults = await sql`
                SELECT * FROM items 
                WHERE pk = ${partitionKey}
                ${sortKeyPattern ? sql`AND sk LIKE ${sortKeyPattern + "%"}` : sql``}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;

                  // Parse JSON data for generic items
                  const parsedItems = itemResults
                    .map((item) => ({
                      ...item,
                      ...(item.json_data || {}),
                    }))
                    .map((item) => {
                      delete item.data;
                      delete item.json_data;
                      return item;
                    });

                  results.push(...parsedItems);
                }

                // Sort and limit results
                results.sort((a, b) => {
                  if (reverse) {
                    return b.sk.localeCompare(a.sk);
                  }
                  return a.sk.localeCompare(b.sk);
                });

                results = results.slice(0, limit);

                // Performance logging is handled by perfTracker

                const result: any = {
                  operation: "query",
                  partitionKey,
                  sortKeyPattern,
                  data: results,
                  count: results.length,
                  scannedCount: results.length,
                  queryOptions: {
                    limit,
                    reverse,
                    attributes,
                    rangeStart,
                    rangeEnd,
                  },
                };

                // Simple pagination - in production you'd want cursor-based pagination
                if (results.length === limit) {
                  result.nextStartKey = encodeURIComponent(
                    JSON.stringify({
                      pk: partitionKey,
                      sk: results[results.length - 1].sk,
                    })
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

                // Query appropriate table based on target entity
                let results: any[] = [];

                if (targetEntity === "Product") {
                  results = await sql`
                SELECT * FROM products 
                WHERE pk = ${pk} AND sk LIKE ${skPrefix + "%"}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;
                } else if (targetEntity === "User") {
                  results = await sql`
                SELECT * FROM users 
                WHERE pk = ${pk} AND sk LIKE ${skPrefix + "%"}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;
                } else {
                  // Query generic items table
                  const itemResults = await sql`
                SELECT *, data as json_data FROM items 
                WHERE pk = ${pk} AND sk LIKE ${skPrefix + "%"}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `;

                  results = itemResults
                    .map((item) => ({
                      ...item,
                      ...(item.json_data || {}),
                    }))
                    .map((item) => {
                      delete item.data;
                      delete item.json_data;
                      return item;
                    });
                }

                // Performance logging is handled by perfTracker

                const result: any = {
                  operation: "queryRelated",
                  entityType,
                  entityId,
                  targetEntity,
                  data: results,
                  count: results.length,
                  scannedCount: results.length,
                };

                if (results.length === limit) {
                  result.nextStartKey = encodeURIComponent(
                    JSON.stringify({ pk, sk: results[results.length - 1].sk })
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
                const startRange = `${prefix}${startTime}`;
                const endRange = `${prefix}${endTime}`;

                // Query all tables for time-based data
                const [userResults, productResults, itemResults] =
                  await Promise.all([
                    sql`
                SELECT * FROM users 
                WHERE pk = ${partitionKey} 
                AND sk BETWEEN ${startRange} AND ${endRange}
                LIMIT ${limit}
              `,
                    sql`
                SELECT * FROM products 
                WHERE pk = ${partitionKey} 
                AND sk BETWEEN ${startRange} AND ${endRange}
                LIMIT ${limit}
              `,
                    sql`
                SELECT *, data as json_data FROM items 
                WHERE pk = ${partitionKey} 
                AND sk BETWEEN ${startRange} AND ${endRange}
                LIMIT ${limit}
              `,
                  ]);

                // Combine and parse results
                const parsedItems = itemResults
                  .map((item) => ({
                    ...item,
                    ...(item.json_data || {}),
                  }))
                  .map((item) => {
                    delete item.data;
                    delete item.json_data;
                    return item;
                  });

                const allResults = [
                  ...userResults,
                  ...productResults,
                  ...parsedItems,
                ];

                // Sort by sort key
                allResults.sort((a, b) => a.sk.localeCompare(b.sk));
                const results = allResults.slice(0, limit);

                // Performance logging is handled by perfTracker

                return Response.json({
                  operation: "queryTimeRange",
                  partitionKey,
                  timeRange: { startTime, endTime },
                  rangePrefix,
                  data: results,
                  count: results.length,
                });
              }

              case "queryAll": {
                // Get all items for an entity (e.g., profile + all related entities)
                if (!entityType || !entityId) {
                  return Response.json(
                    {
                      error:
                        "entityType and entityId are required for queryAll",
                    },
                    { status: 400 }
                  );
                }

                const pk = `${entityType}#${entityId}`;

                // Query all tables for this partition key
                const [userResults, productResults, itemResults] =
                  await Promise.all([
                    sql`
                SELECT * FROM users 
                WHERE pk = ${pk}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `,
                    sql`
                SELECT * FROM products 
                WHERE pk = ${pk}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `,
                    sql`
                SELECT *, data as json_data FROM items 
                WHERE pk = ${pk}
                ${reverse ? sql`ORDER BY sk DESC` : sql`ORDER BY sk ASC`}
                LIMIT ${limit}
              `,
                  ]);

                // Parse generic items
                const parsedItems = itemResults
                  .map((item) => ({
                    ...item,
                    ...(item.json_data || {}),
                  }))
                  .map((item) => {
                    delete item.data;
                    delete item.json_data;
                    return item;
                  });

                // Combine all results
                const allItems = [
                  ...userResults,
                  ...productResults,
                  ...parsedItems,
                ];

                // Sort by sort key
                allItems.sort((a, b) => {
                  if (reverse) {
                    return b.sk.localeCompare(a.sk);
                  }
                  return a.sk.localeCompare(b.sk);
                });

                // Performance logging is handled by perfTracker

                // Group items by entity type for easier frontend consumption
                const groupedData: Record<string, any[]> = {};
                const profile = allItems.find((item) => item.sk === "Profile");

                allItems.forEach((item) => {
                  if (item.sk === "Profile") return; // Handle profile separately

                  const skParts = (item.sk as string).split("#");
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
                    raw: allItems,
                  },
                  count: allItems.length,
                  totalItems: allItems.length,
                });
              }

              case "scan": {
                // Generic scan operation (use sparingly!)
                const filterExpression =
                  url.searchParams.get("filterExpression");

                // Query all tables - this is expensive!
                const [userResults, productResults, itemResults] =
                  await Promise.all([
                    sql`
                SELECT * FROM users 
                LIMIT ${limit}
              `,
                    sql`
                SELECT * FROM products 
                LIMIT ${limit}
              `,
                    sql`
                SELECT *, data as json_data FROM items 
                LIMIT ${limit}
              `,
                  ]);

                // Parse generic items
                const parsedItems = itemResults
                  .map((item) => ({
                    ...item,
                    ...(item.json_data || {}),
                  }))
                  .map((item) => {
                    delete item.data;
                    delete item.json_data;
                    return item;
                  });

                // Combine all results
                const allResults = [
                  ...userResults,
                  ...productResults,
                  ...parsedItems,
                ];
                const results = allResults.slice(0, limit);

                // Performance logging is handled by perfTracker

                const result: any = {
                  operation: "scan",
                  data: results,
                  count: results.length,
                  scannedCount: results.length,
                  warning:
                    "Scan operations are expensive - use query when possible",
                };

                if (results.length === limit) {
                  result.nextStartKey = encodeURIComponent(
                    JSON.stringify({
                      pk: results[results.length - 1].pk,
                      sk: results[results.length - 1].sk,
                    })
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
                      queryRelated:
                        "Query related entities for a parent entity",
                      queryTimeRange: "Query items within a time range",
                      queryAll:
                        "Get all items for an entity (profile + related)",
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
              // Create a user profile
              await sql`
            INSERT OR REPLACE INTO users (pk, sk, name)
            VALUES (${"User#1"}, ${"Profile"}, ${"John Doe"})
          `;

              // Create some products for the user with timestamp-based sort keys
              const now = new Date();
              const timestamp1 = new Date(
                now.getTime() - 3600000
              ).toISOString(); // 1 hour ago
              const timestamp2 = new Date(
                now.getTime() - 1800000
              ).toISOString(); // 30 min ago
              const timestamp3 = new Date().toISOString(); // now

              const product1SK = createTimestampSK("1", timestamp1);
              const product2SK = createTimestampSK("2", timestamp2);
              const product3SK = createReverseTimestampSK("3", timestamp3);

              // Insert products
              await Promise.all([
                sql`
              INSERT OR REPLACE INTO products (pk, sk, product_id, name, price, description, created_at)
              VALUES (${"User#1"}, ${product1SK}, ${"1"}, ${"Laptop"}, ${999.99}, ${"High-performance laptop"}, ${timestamp1})
            `,
                sql`
              INSERT OR REPLACE INTO products (pk, sk, product_id, name, price, description, created_at)
              VALUES (${"User#1"}, ${product2SK}, ${"2"}, ${"Mouse"}, ${29.99}, ${"Wireless mouse"}, ${timestamp2})
            `,
                sql`
              INSERT OR REPLACE INTO products (pk, sk, product_id, name, price, description, created_at)
              VALUES (${"User#1"}, ${product3SK}, ${"3"}, ${"Keyboard"}, ${79.99}, ${"Mechanical keyboard"}, ${timestamp3})
            `,
              ]);

              return Response.json({
                message: "Test data created successfully",
                created: {
                  profile: "User#1 Profile",
                  products: [
                    `User#1 ${product1SK}`,
                    `User#1 ${product2SK}`,
                    `User#1 ${product3SK}`,
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

        "/api/amazon/:keyword/:limit": async (req) => {
          const { keyword, limit } = req.params;
          const results = await searchAmazon(keyword, Number(limit));
          return Response.json(results);
        },

        "/api/test": async (req) => {
          const users = await sql`
        SELECT * FROM users
        WHERE active = ${true}
        LIMIT ${10}
      `;
          return Response.json(users);
        },

        // Performance test page
        "/performance": async (req) => {
          const performanceHtml = await Bun.file(
            "./performance-test.html"
          ).text();
          return new Response(performanceHtml, {
            headers: { "Content-Type": "text/html" },
          });
        },

        // Handle Amazon route
      },

      development: process.env.NODE_ENV !== "production" && {
        // Enable browser hot reloading in development
        hmr: true,

        // Echo console logs from the browser to the server
        console: true,
      },
      port: 3000,
    });

    console.log(`🚀 Server running at ${server.url}`);
    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Performance monitoring utilities
interface PerformanceMetrics {
  requestStart: number;
  dbQueryStart?: number;
  dbQueryEnd?: number;
  processingStart?: number;
  processingEnd?: number;
  serializationStart?: number;
  serializationEnd?: number;
  requestEnd: number;
  totalTime: number;
  dbTime?: number;
  processingTime?: number;
  serializationTime?: number;
}

const createPerformanceTracker = () => {
  const metrics: PerformanceMetrics = {
    requestStart: performance.now(),
    requestEnd: 0,
    totalTime: 0,
  };

  return {
    startDbQuery: () => {
      metrics.dbQueryStart = performance.now();
    },
    endDbQuery: () => {
      metrics.dbQueryEnd = performance.now();
      metrics.dbTime = metrics.dbQueryEnd - (metrics.dbQueryStart || 0);
    },
    startProcessing: () => {
      metrics.processingStart = performance.now();
    },
    endProcessing: () => {
      metrics.processingEnd = performance.now();
      metrics.processingTime =
        metrics.processingEnd - (metrics.processingStart || 0);
    },
    startSerialization: () => {
      metrics.serializationStart = performance.now();
    },
    endSerialization: () => {
      metrics.serializationEnd = performance.now();
      metrics.serializationTime =
        metrics.serializationEnd - (metrics.serializationStart || 0);
    },
    finish: () => {
      metrics.requestEnd = performance.now();
      metrics.totalTime = metrics.requestEnd - metrics.requestStart;
      return metrics;
    },
    getMetrics: () => metrics,
  };
};

// Enhanced Response helper with performance data
const createTimedResponse = (
  data: any,
  metrics: PerformanceMetrics,
  operation: string
) => {
  const responseData = {
    ...data,
    performance: {
      operation,
      timing: {
        total: `${metrics.totalTime.toFixed(2)}ms`,
        database: metrics.dbTime ? `${metrics.dbTime.toFixed(2)}ms` : "N/A",
        processing: metrics.processingTime
          ? `${metrics.processingTime.toFixed(2)}ms`
          : "N/A",
        serialization: metrics.serializationTime
          ? `${metrics.serializationTime.toFixed(2)}ms`
          : "N/A",
      },
      breakdown: {
        totalMs: parseFloat(metrics.totalTime.toFixed(2)),
        databaseMs: metrics.dbTime ? parseFloat(metrics.dbTime.toFixed(2)) : 0,
        processingMs: metrics.processingTime
          ? parseFloat(metrics.processingTime.toFixed(2))
          : 0,
        serializationMs: metrics.serializationTime
          ? parseFloat(metrics.serializationTime.toFixed(2))
          : 0,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        server: "bun-sql",
        version: "1.0.0",
      },
    },
  };

  // Log performance metrics
  console.log(
    `[${operation}] Total: ${metrics.totalTime.toFixed(2)}ms | DB: ${metrics.dbTime?.toFixed(2) || "N/A"}ms | Processing: ${metrics.processingTime?.toFixed(2) || "N/A"}ms`
  );

  return Response.json(responseData, {
    headers: {
      "X-Response-Time": `${metrics.totalTime.toFixed(2)}ms`,
      "X-DB-Time": `${metrics.dbTime?.toFixed(2) || 0}ms`,
      "X-Processing-Time": `${metrics.processingTime?.toFixed(2) || 0}ms`,
      "Server-Timing": `total;dur=${metrics.totalTime.toFixed(2)}, db;dur=${metrics.dbTime?.toFixed(2) || 0}, processing;dur=${metrics.processingTime?.toFixed(2) || 0}`,
      "Access-Control-Expose-Headers":
        "X-Response-Time, X-DB-Time, X-Processing-Time, Server-Timing",
    },
  });
};

// Start the server
startServer();
