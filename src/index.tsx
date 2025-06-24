/*
Modern SQL Database Design:

1. Entity Structure:
   - Users table: Stores user profiles with proper primary keys
   - Products table: Stores products with foreign key to users table
   - Orders table: Stores orders with foreign key to users table  
   - Order Items table: Junction table for orders and products

2. Access Patterns:
   - Get User by ID: /api/query?table=users&id=1
   - Get User Products: /api/query?table=products&userId=1
   - Get Orders by Status: /api/query?table=orders&status=pending
   - Get Order Items: /api/query?table=order_items&orderId=1

3. Query Examples:
   - `/api/query?table=users&operation=select&limit=10` - Gets all users
   - `/api/query?table=products&operation=select&userId=1` - Gets products for user 1
   - `/api/query?table=orders&operation=select&status=pending` - Gets pending orders
   - `/api/query?table=products&operation=aggregate&groupBy=category` - Product stats by category

4. Benefits:
   - Proper relational data integrity with foreign keys
   - Standard SQL operations with joins
   - Efficient indexing and querying
   - Flexible filtering and sorting
   - Built-in pagination support
*/

import { serve, sql } from "bun";

// import { queryTester } from "./lib/queryTester";
import index from "./index.html";
import { searchAmazon } from "./amazon-scraper";
import { initDatabase } from "./lib/migrate";
import generalQuery from "./lib/generalQuery";

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database first
    await initDatabase();

    // Then start the server
    const server = serve({
      idleTimeout: 60, // 60 seconds idle timeout
      routes: {
        // Serve index.html for all unmatched routes.
        "/*": index,

        // Modern SQL API endpoint
        "/api/query": async (req) => {
          const url = new URL(req.url);
          const result = await generalQuery(url);
          return Response.json(result);
        },

        // Create test data endpoint
        "/api/seed": {
          async POST(req) {
            try {
              // Create sample users
              const users = await Promise.all([
                sql`
                  INSERT INTO users (name, email, active)
                  VALUES ('John Doe', 'john@example.com', true)
                  RETURNING id, name, email
                `,
                sql`
                  INSERT INTO users (name, email, active)
                  VALUES ('Jane Smith', 'jane@example.com', true)
                  RETURNING id, name, email
                `,
                sql`
                  INSERT INTO users (name, email, active)
                  VALUES ('Bob Johnson', 'bob@example.com', false)
                  RETURNING id, name, email
                `,
              ]);

              const user1Id = users[0][0].id;
              const user2Id = users[1][0].id;
              const user3Id = users[2][0].id;

              // Create sample products
              const products = await Promise.all([
                sql`
                  INSERT INTO products (user_id, name, price, description, category, in_stock)
                  VALUES (${user1Id}, 'Laptop', 999.99, 'High-performance laptop', 'Electronics', true)
                  RETURNING id, name, price
                `,
                sql`
                  INSERT INTO products (user_id, name, price, description, category, in_stock)
                  VALUES (${user1Id}, 'Wireless Mouse', 29.99, 'Ergonomic wireless mouse', 'Electronics', true)
                  RETURNING id, name, price
                `,
                sql`
                  INSERT INTO products (user_id, name, price, description, category, in_stock)
                  VALUES (${user2Id}, 'Mechanical Keyboard', 149.99, 'RGB mechanical keyboard', 'Electronics', true)
                  RETURNING id, name, price
                `,
                sql`
                  INSERT INTO products (user_id, name, price, description, category, in_stock)
                  VALUES (${user2Id}, 'Office Chair', 299.99, 'Ergonomic office chair', 'Furniture', false)
                  RETURNING id, name, price
                `,
                sql`
                  INSERT INTO products (user_id, name, price, description, category, in_stock)
                  VALUES (${user3Id}, 'Standing Desk', 599.99, 'Adjustable standing desk', 'Furniture', true)
                  RETURNING id, name, price
                `,
              ]);

              // Create sample orders
              const orders = await Promise.all([
                sql`
                  INSERT INTO orders (user_id, total_amount, status)
                  VALUES (${user1Id}, 49.99, 'completed')
                  RETURNING id, total_amount, status
                `,
                sql`
                  INSERT INTO orders (user_id, total_amount, status)
                  VALUES (${user2Id}, 899.98, 'pending')
                  RETURNING id, total_amount, status
                `,
                sql`
                  INSERT INTO orders (user_id, total_amount, status)
                  VALUES (${user1Id}, 1029.98, 'shipped')
                  RETURNING id, total_amount, status
                `,
              ]);

              const order1Id = orders[0][0].id;
              const order2Id = orders[1][0].id;
              const order3Id = orders[2][0].id;

              // Create order items
              await Promise.all([
                sql`
                  INSERT INTO order_items (order_id, product_id, quantity, price)
                  VALUES (${order1Id}, ${products[1][0].id}, 1, 29.99)
                `,
                sql`
                  INSERT INTO order_items (order_id, product_id, quantity, price)
                  VALUES (${order1Id}, ${products[0][0].id}, 1, 999.99)
                `,
                sql`
                  INSERT INTO order_items (order_id, product_id, quantity, price)
                  VALUES (${order2Id}, ${products[2][0].id}, 2, 149.99)
                `,
                sql`
                  INSERT INTO order_items (order_id, product_id, quantity, price)
                  VALUES (${order2Id}, ${products[3][0].id}, 1, 299.99)
                `,
                sql`
                  INSERT INTO order_items (order_id, product_id, quantity, price)
                  VALUES (${order3Id}, ${products[4][0].id}, 1, 599.99)
                `,
              ]);

              return Response.json({
                message: "Test data created successfully",
                created: {
                  users: users.map((u) => u[0]),
                  products: products.map((p) => p[0]),
                  orders: orders.map((o) => o[0]),
                  totalUsers: users.length,
                  totalProducts: products.length,
                  totalOrders: orders.length,
                  totalOrderItems: 5,
                },
                examples: {
                  queryUsers:
                    "/api/query?table=users&operation=select&limit=10",
                  queryProducts:
                    "/api/query?table=products&operation=select&userId=1",
                  queryOrders:
                    "/api/query?table=orders&operation=select&status=pending",
                  aggregateProductsByCategory:
                    "/api/query?table=products&operation=aggregate&groupBy=category",
                  aggregateOrdersByStatus:
                    "/api/query?table=orders&operation=aggregate&groupBy=status",
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

          // Add products to our database
          const savedProducts = [];

          for (const product of results.products) {
            try {
              // Convert price string to number (remove currency symbols and non-numeric chars)
              const priceValue =
                product.price !== "N/A"
                  ? parseFloat(
                      product.price.replace(/[^\d.,]/g, "").replace(",", "")
                    )
                  : null;

              // Convert rating string to number
              const ratingValue =
                product.rating !== "N/A" ? parseFloat(product.rating) : null;

              // Convert review count string to number
              const reviewCountValue =
                product.reviewCount !== "N/A"
                  ? parseInt(product.reviewCount.replace(/[^\d]/g, ""))
                  : null;

              // Insert product into database
              const dbProduct = await sql`
                INSERT INTO products (
                  name, 
                  price, 
                  keyword, 
                  rating, 
                  review_count, 
                  image_url, 
                  source_url, 
                  source_type,
                  category,
                  status,
                  in_stock
                )
                VALUES (
                  ${product.title},
                  ${priceValue},
                  ${keyword},
                  ${ratingValue},
                  ${reviewCountValue},
                  ${product.image},
                  ${product.url},
                  'amazon',
                  'Electronics',
                  'active',
                  true
                )
                RETURNING *
              `;

              savedProducts.push(dbProduct[0]);
            } catch (error) {
              console.error(`Failed to save product ${product.title}:`, error);
            }
          }

          // Return response with both scraped data and saved products
          return Response.json({
            ...results,
            savedToDatabase: {
              count: savedProducts.length,
              products: savedProducts,
            },
          });
        },

        "/api/products": async (req) => {
          const url = new URL(req.url);
          const keyword = url.searchParams.get("keyword");
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const offset = parseInt(url.searchParams.get("offset") || "0");

          let products;
          if (keyword) {
            products = await sql`
              SELECT * FROM products 
              WHERE keyword ILIKE ${`%${keyword}%`} 
                OR name ILIKE ${`%${keyword}%`}
              ORDER BY created_at DESC
              LIMIT ${limit} OFFSET ${offset}
            `;
          } else {
            products = await sql`
              SELECT * FROM products 
              ORDER BY created_at DESC
              LIMIT ${limit} OFFSET ${offset}
            `;
          }

          return Response.json({
            success: true,
            data: products,
            pagination: {
              limit,
              offset,
              keyword,
            },
          });
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

    // await queryTester.runTestSuite();
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
