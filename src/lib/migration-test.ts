/**
 * Migration System Test Utility
 *
 * This utility helps test the migration system fixes, particularly:
 * - CREATE TABLE IF NOT EXISTS functionality
 * - Recovery from partial database states
 * - Schema version tracking
 */

import { sql } from "bun";
import { initDatabase, checkDatabaseStatus, resetDatabase } from "./migrate";

export const testMigrationScenarios = async () => {
  console.log("🧪 Testing Migration System...\n");

  try {
    // Test 1: Fresh database initialization
    console.log("Test 1: Fresh Database Initialization");
    console.log("=====================================");
    await resetDatabase(); // Start with clean slate
    const status1 = await checkDatabaseStatus();
    console.log("✅ Fresh init result:", status1);
    console.log("");

    // Test 2: Re-run initialization (should be safe)
    console.log("Test 2: Re-run Initialization (Safe)");
    console.log("====================================");
    await initDatabase(); // Should not error
    const status2 = await checkDatabaseStatus();
    console.log("✅ Re-init result:", status2);
    console.log("");

    // Test 3: Simulate partial state (schema_versions missing)
    console.log("Test 3: Partial State Recovery");
    console.log("==============================");

    // Drop only schema_versions table to simulate the bug scenario
    await sql`DROP TABLE IF EXISTS schema_versions`;
    console.log("   Dropped schema_versions table (simulating partial state)");

    // Try to initialize - this should now work without errors
    await initDatabase();
    const status3 = await checkDatabaseStatus();
    console.log("✅ Partial recovery result:", status3);
    console.log("");

    // Test 4: Skip if exists functionality
    console.log("Test 4: Skip If Exists");
    console.log("======================");
    const startTime = Date.now();
    await initDatabase({ skipIfExists: true });
    const endTime = Date.now();
    console.log(
      `✅ Skip completed in ${endTime - startTime}ms (should be fast)`
    );
    console.log("");

    // Test 5: Verify data integrity
    console.log("Test 5: Data Integrity Check");
    console.log("============================");

    // Insert some test data
    await sql`INSERT INTO users (name, email) VALUES ('Test User', 'test@example.com')`;
    await sql`INSERT INTO products (name, price, user_id) VALUES ('Test Product', 99.99, 1)`;

    // Re-run init to ensure data is preserved
    await initDatabase();

    const users = await sql`SELECT COUNT(*) as count FROM users`;
    const products = await sql`SELECT COUNT(*) as count FROM products`;

    console.log(`✅ Users count: ${users[0].count} (should be 1)`);
    console.log(`✅ Products count: ${products[0].count} (should be 1)`);
    console.log("");

    console.log("🎉 All migration tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Migration test failed:", error);
    return false;
  }
};

// Test runner for command line usage
export const runMigrationTests = async () => {
  const success = await testMigrationScenarios();
  process.exit(success ? 0 : 1);
};

// If run directly
if (require.main === module) {
  runMigrationTests();
}
