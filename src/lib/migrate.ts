import { serve, sql } from "bun";

// Database schema version for migration tracking
const CURRENT_SCHEMA_VERSION = 1;

// Check if database exists and get current version
const getCurrentSchemaVersion = async (): Promise<number> => {
  try {
    // Try to get schema version from a metadata table
    const result = await sql`
      SELECT version FROM schema_versions 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    return result[0]?.version || 0;
  } catch (error) {
    // If table doesn't exist, we're at version 0
    return 0;
  }
};

// Create schema_versions table for tracking migrations
const createSchemaVersionsTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_versions (
      id SERIAL PRIMARY KEY,
      version INTEGER NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
};

// Record a schema version
const recordSchemaVersion = async (version: number, description: string) => {
  await sql`
    INSERT INTO schema_versions (version, description) 
    VALUES (${version}, ${description})
  `;
};

// Check if a table exists
const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `;
    return result[0]?.exists || false;
  } catch (error) {
    return false;
  }
};

// Create initial tables (migration v1)
const createInitialTables = async () => {
  console.log("Creating initial database schema...");

  // Create users table with proper SQL structure
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      email TEXT UNIQUE,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log("Created/verified users table");

  // Create products table with proper SQL structure and foreign key
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price DECIMAL(10,2),
      description TEXT,
      category TEXT,
      status TEXT DEFAULT 'active',
      in_stock BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log("Created/verified products table");

  // Create orders table for more complex queries
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      total_amount DECIMAL(10,2),
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log("Created/verified orders table");

  // Create order_items table for order details
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log("Created/verified order_items table");

  // Create indexes for better performance (using CREATE INDEX IF NOT EXISTS)
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)`;
  console.log("Created/verified indexes");
};

// Database initialization with smart migration
export const initDatabase = async (
  options: {
    forceReset?: boolean;
    skipIfExists?: boolean;
  } = {}
) => {
  try {
    console.log("Starting database initialization...");

    // Create schema versions table first
    await createSchemaVersionsTable();

    const currentVersion = await getCurrentSchemaVersion();
    console.log(`Current schema version: ${currentVersion}`);

    // Option 1: Force reset (drops all tables)
    if (options.forceReset) {
      console.log("⚠️  Force reset requested - dropping all tables...");
      await sql`DROP TABLE IF EXISTS order_items CASCADE`;
      await sql`DROP TABLE IF EXISTS orders CASCADE`;
      await sql`DROP TABLE IF EXISTS products CASCADE`;
      await sql`DROP TABLE IF EXISTS users CASCADE`;
      await sql`DROP TABLE IF EXISTS schema_versions CASCADE`;
      console.log("Dropped existing tables");

      // Recreate schema versions table and continue with fresh setup
      await createSchemaVersionsTable();
      await createInitialTables();
      await recordSchemaVersion(
        CURRENT_SCHEMA_VERSION,
        "Initial schema creation (force reset)"
      );
      return;
    }

    // Option 2: Skip if database already exists
    if (options.skipIfExists && currentVersion >= CURRENT_SCHEMA_VERSION) {
      console.log(
        "✅ Database already exists and is up to date, skipping initialization"
      );
      return;
    }

    // Option 3: Smart migration based on current version
    if (currentVersion === 0) {
      // Check if core tables already exist even though schema_versions doesn't
      const usersExists = await tableExists("users");
      const productsExists = await tableExists("products");

      if (usersExists || productsExists) {
        console.log("⚠️  Found existing tables but no schema_versions table.");
        console.log("   This suggests a partial or legacy database state.");
        console.log("   Creating/updating tables safely with IF NOT EXISTS...");
      } else {
        console.log(
          "🚀 No existing schema found, creating initial database..."
        );
      }

      // Create/update tables safely - IF NOT EXISTS handles existing tables
      await createInitialTables();
      await recordSchemaVersion(
        CURRENT_SCHEMA_VERSION,
        usersExists || productsExists
          ? "Schema recovery - updated existing tables"
          : "Initial schema creation"
      );
    } else if (currentVersion < CURRENT_SCHEMA_VERSION) {
      // Run migrations to bring schema up to date
      console.log(
        `🔄 Upgrading schema from version ${currentVersion} to ${CURRENT_SCHEMA_VERSION}...`
      );
      await runMigrations(currentVersion, CURRENT_SCHEMA_VERSION);
    } else {
      console.log("✅ Database schema is already up to date");
    }

    // Test query to verify tables exist
    const testResult = await sql`SELECT COUNT(*) as count FROM users`;
    console.log("Database test query successful:", testResult[0]);

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error; // Re-throw to stop server startup if DB init fails
  }
};

// Run incremental migrations
const runMigrations = async (fromVersion: number, toVersion: number) => {
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    console.log(`Running migration to version ${version}...`);

    switch (version) {
      case 1:
        // This would be for future migrations
        console.log("Migration v1: No additional changes needed");
        break;
      // Add future migrations here
      // case 2:
      //   await sql`ALTER TABLE products ADD COLUMN sku TEXT`;
      //   break;
      default:
        console.log(`No migration defined for version ${version}`);
    }

    await recordSchemaVersion(version, `Migration to version ${version}`);
  }
};

// Utility functions for development
export const resetDatabase = async () => {
  console.log("🔄 Resetting database...");
  await initDatabase({ forceReset: true });
};

export const checkDatabaseStatus = async () => {
  try {
    const version = await getCurrentSchemaVersion();
    const usersExists = await tableExists("users");
    const productsExists = await tableExists("products");
    const ordersExists = await tableExists("orders");

    return {
      schemaVersion: version,
      tablesExist: {
        users: usersExists,
        products: productsExists,
        orders: ordersExists,
      },
      isHealthy: usersExists && productsExists && ordersExists,
    };
  } catch (error) {
    return {
      schemaVersion: 0,
      tablesExist: {},
      isHealthy: false,
      error: error.message,
    };
  }
};
