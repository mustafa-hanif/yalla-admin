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

import { serve } from "bun";

// import { queryTester } from "./lib/queryTester";
import index from "./index.html";
import { searchAmazon } from "./amazon-scraper";
import generalQuery from "./lib/generalQuery";

// Initialize database and start server
const startServer = async () => {
  try {
    // Then start the server
    const server = serve({
      idleTimeout: 60, // 60 seconds idle timeout
      routes: {
        // Serve index.html for all unmatched routes.
        "/*": index,

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

              savedProducts.push({
                name: product.title,
                price: priceValue,
                keyword: keyword,
                rating: ratingValue,
                review_count: reviewCountValue,
                image_url: product.image,
                source_url: product.url,
                source_type: "amazon",
                category: "Electronics",
                status: "active",
                in_stock: true,
              });
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

// Start the server
startServer();
