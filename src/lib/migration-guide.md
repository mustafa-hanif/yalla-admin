# Database Migration System Usage Guide

## 🎯 **Smart Database Initialization**

The new migration system provides multiple options for database initialization without always dropping tables:

## 📋 **Usage Options**

### **1. Smart Default (Recommended for Production)**

```typescript
import { initDatabase } from "./lib/migrate";

// Smart initialization - only creates tables if they don't exist
await initDatabase();
```

**What it does:**

- ✅ Checks current schema version
- ✅ Creates tables only if they don't exist (`CREATE TABLE IF NOT EXISTS`)
- ✅ Runs incremental migrations if needed
- ✅ Preserves existing data
- ✅ **Handles partial database states** (e.g., tables exist but no schema_versions table)
- ✅ **Recovery-safe** - won't fail if some tables already exist

### **2. Skip If Database Exists (Fast Startup)**

```typescript
// Skip initialization if database is already set up
await initDatabase({ skipIfExists: true });
```

**What it does:**

- ✅ Quick check if database exists
- ✅ Skips all setup if tables are present
- ✅ Fastest startup time
- ✅ Perfect for production environments

### **3. Force Reset (Development Only)**

```typescript
// ⚠️ WARNING: This drops all tables and data!
await initDatabase({ forceReset: true });

// Or use the utility function
import { resetDatabase } from "./lib/migrate";
await resetDatabase();
```

**What it does:**

- ⚠️ Drops ALL tables and data
- 🔄 Creates fresh database schema
- 🧪 Perfect for development/testing
- ❌ **Never use in production!**

## 🏗 **Migration System Features**

### **Schema Version Tracking**

- Tracks current database schema version
- Enables safe incremental upgrades
- Prevents data loss during updates

### **Table Existence Checks**

- Checks if tables exist before creating
- Prevents SQL errors from duplicate table creation
- Smart conditional migration logic

### **Health Check Utility**

```typescript
import { checkDatabaseStatus } from "./lib/migrate";

const status = await checkDatabaseStatus();
console.log(status);
// Output:
// {
//   schemaVersion: 1,
//   tablesExist: {
//     users: true,
//     products: true,
//     orders: true
//   },
//   isHealthy: true
// }
```

## 🔄 **Adding New Migrations**

To add a new migration (e.g., adding a column):

1. **Update the schema version:**

```typescript
const CURRENT_SCHEMA_VERSION = 2; // Increment version
```

2. **Add migration case:**

```typescript
const runMigrations = async (fromVersion: number, toVersion: number) => {
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    switch (version) {
      case 1:
        // Existing migration
        break;
      case 2:
        // New migration
        await sql`ALTER TABLE products ADD COLUMN sku TEXT`;
        await sql`CREATE INDEX idx_products_sku ON products(sku)`;
        break;
    }
    await recordSchemaVersion(version, `Migration to version ${version}`);
  }
};
```

## 🚀 **Recommended Usage Patterns**

### **Development Environment**

```typescript
// In your dev startup script
if (process.env.NODE_ENV === "development") {
  // Option A: Reset database on every startup (clean slate)
  await initDatabase({ forceReset: true });

  // Option B: Smart initialization (preserves data)
  await initDatabase();
}
```

### **Production Environment**

```typescript
// In your production startup script
if (process.env.NODE_ENV === "production") {
  // Always use smart initialization in production
  await initDatabase({ skipIfExists: true });
}
```

### **Testing Environment**

```typescript
// In your test setup
beforeEach(async () => {
  // Reset database before each test
  await resetDatabase();
});
```

## 🛡 **Safety Features**

1. **Transaction Safety** - All migrations run in transactions
2. **Version Tracking** - Prevents running migrations twice
3. **Error Handling** - Stops startup if database init fails
4. **Conditional Creation** - Uses `CREATE TABLE IF NOT EXISTS` patterns
5. **Rollback Support** - Schema version tracking enables rollbacks

## 📝 **Migration Log Example**

When you start your app, you'll see logs like:

```
Starting database initialization...
Current schema version: 0
🚀 No existing schema found, creating initial database...
Created users table
Created products table
Created orders table
Created order_items table
Created indexes
Database test query successful: { count: "0" }
✅ Database initialized successfully
```

## 🎛 **Environment Variables**

You can control behavior with environment variables:

```bash
# Skip database init if it exists (production)
DB_SKIP_IF_EXISTS=true

# Force reset database (development)
DB_FORCE_RESET=true

# Environment-based behavior
NODE_ENV=production  # Uses skipIfExists
NODE_ENV=development # Uses smart initialization
NODE_ENV=test        # Uses forceReset
```

This migration system provides a production-ready, safe way to handle database initialization while giving you full control over when and how your database schema is managed! 🎯

## 🔧 **Troubleshooting**

### **Error: "relation 'users' already exists"**

This error occurred in previous versions when tables existed but the `schema_versions` table was missing. **This is now fixed!**

✅ **Solution**: The migration system now uses `CREATE TABLE IF NOT EXISTS` for all tables and handles partial database states intelligently.

### **Partial Database Recovery**

If you encounter a state where some tables exist but the migration system seems confused:

1. **Check database status:**

   ```typescript
   import { checkDatabaseStatus } from "./lib/migrate";
   const status = await checkDatabaseStatus();
   console.log(status);
   ```

2. **The system will automatically detect and handle:**

   - Missing `schema_versions` table
   - Existing tables without version tracking
   - Partial table creation from interrupted migrations

3. **Recovery behavior:**
   - Creates missing tables safely with `IF NOT EXISTS`
   - Records the current state in `schema_versions`
   - Logs whether this was a recovery or fresh install

### **Common Issues**

1. **Database connection errors**: Check your database connection string
2. **Permission errors**: Ensure your database user has CREATE TABLE permissions
3. **Constraint conflicts**: The system handles foreign key dependencies automatically
4. **Index conflicts**: All indexes use `CREATE INDEX IF NOT EXISTS`

### **Manual Recovery**

If you need to manually reset (⚠️ **DANGER - loses all data**):

```typescript
import { resetDatabase } from "./lib/migrate";
await resetDatabase(); // Drops all tables and recreates
```
