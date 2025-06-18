import generalQuery from "./generalQuery";
import type { QueryResult } from "./generalQueryTypes";

/**
 * Test utility for the general query engine
 */
export class QueryTester {
  private baseUrl: string;

  constructor(baseUrl: string = window.location.origin) {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a test URL with query parameters
   */
  private createTestUrl(params: Record<string, string>): URL {
    const url = new URL("/api/query", this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url;
  }

  /**
   * Test SELECT operations
   */
  async testSelect(params: {
    table: string;
    columns?: string;
    where?: Record<string, string>;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
    limit?: number;
    offset?: number;
  }): Promise<QueryResult> {
    const queryParams: Record<string, string> = {
      table: params.table,
      operation: "select",
    };

    if (params.columns) queryParams.columns = params.columns;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderDirection)
      queryParams.orderDirection = params.orderDirection;
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.offset) queryParams.offset = params.offset.toString();

    // Add WHERE conditions
    if (params.where) {
      Object.entries(params.where).forEach(([key, value]) => {
        queryParams[`where_${key}`] = value;
      });
    }

    const url = this.createTestUrl(queryParams);
    return await generalQuery(url);
  }

  /**
   * Test INSERT operations
   */
  async testInsert(params: {
    table: string;
    data: Record<string, string>;
  }): Promise<QueryResult> {
    const queryParams: Record<string, string> = {
      table: params.table,
      operation: "insert",
    };

    // Add data fields
    Object.entries(params.data).forEach(([key, value]) => {
      queryParams[`data_${key}`] = value;
    });

    const url = this.createTestUrl(queryParams);
    return await generalQuery(url);
  }

  /**
   * Test UPDATE operations
   */
  async testUpdate(params: {
    table: string;
    data: Record<string, string>;
    where: Record<string, string>;
  }): Promise<QueryResult> {
    const queryParams: Record<string, string> = {
      table: params.table,
      operation: "update",
    };

    // Add data fields
    Object.entries(params.data).forEach(([key, value]) => {
      queryParams[`data_${key}`] = value;
    });

    // Add WHERE conditions
    Object.entries(params.where).forEach(([key, value]) => {
      queryParams[`where_${key}`] = value;
    });

    const url = this.createTestUrl(queryParams);
    return await generalQuery(url);
  }

  /**
   * Test DELETE operations
   */
  async testDelete(params: {
    table: string;
    where: Record<string, string>;
  }): Promise<QueryResult> {
    const queryParams: Record<string, string> = {
      table: params.table,
      operation: "delete",
    };

    // Add WHERE conditions
    Object.entries(params.where).forEach(([key, value]) => {
      queryParams[`where_${key}`] = value;
    });

    const url = this.createTestUrl(queryParams);
    return await generalQuery(url);
  }

  /**
   * Test JOIN operations
   */
  async testSelectWithJoin(params: {
    table: string;
    columns?: string;
    joins: Array<{
      table: string;
      type: "INNER" | "LEFT" | "RIGHT" | "FULL";
      on: string;
    }>;
    where?: Record<string, string>;
    orderBy?: string;
    limit?: number;
  }): Promise<QueryResult> {
    const queryParams: Record<string, string> = {
      table: params.table,
      operation: "select",
    };

    if (params.columns) queryParams.columns = params.columns;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.limit) queryParams.limit = params.limit.toString();

    // Add JOIN parameters
    params.joins.forEach((join, index) => {
      queryParams[`join_${index}_table`] = join.table;
      queryParams[`join_${index}_type`] = join.type;
      queryParams[`join_${index}_on`] = join.on;
    });

    // Add WHERE conditions
    if (params.where) {
      Object.entries(params.where).forEach(([key, value]) => {
        queryParams[`where_${key}`] = value;
      });
    }

    const url = this.createTestUrl(queryParams);
    return await generalQuery(url);
  }

  /**
   * Run a comprehensive test suite
   */
  async runTestSuite(): Promise<void> {
    console.log("🧪 Starting General Query Engine Test Suite...\n");

    try {
      // Test 1: Simple SELECT
      console.log("Test 1: Simple SELECT");
      const selectResult = await this.testSelect({
        table: "users",
        columns: "id,name,email",
        limit: 5,
      });
      console.log("Result:", selectResult.success ? "✅ Success" : "❌ Failed");
      console.log("Data:", selectResult.data?.length, "records\n");

      // Test 2: SELECT with WHERE
      console.log("Test 2: SELECT with WHERE conditions");
      const selectWhereResult = await this.testSelect({
        table: "products",
        where: { status: "active", category: "mobile" },
        orderBy: "name",
        orderDirection: "ASC",
      });
      console.log(
        "Result:",
        selectWhereResult.success ? "✅ Success" : "❌ Failed"
      );
      console.log("Data:", selectWhereResult.data?.length, "records\n");

      // Test 3: INSERT
      console.log("Test 3: INSERT operation");
      const insertResult = await this.testInsert({
        table: "products",
        data: {
          name: "Test Product",
          price: "19.99",
          status: "active",
        },
      });
      console.log("Result:", insertResult.success ? "✅ Success" : "❌ Failed");
      console.log("Message:", insertResult.error || "Insert completed\n");

      // Test 4: UPDATE
      console.log("Test 4: UPDATE operation");
      const updateResult = await this.testUpdate({
        table: "products",
        data: { status: "inactive" },
        where: { id: "1" },
      });
      console.log("Result:", updateResult.success ? "✅ Success" : "❌ Failed");
      console.log("Message:", updateResult.error || "Update completed\n");

      // Test 5: JOIN
      console.log("Test 5: SELECT with JOIN");
      const joinResult = await this.testSelectWithJoin({
        table: "orders",
        columns: "orders.id,orders.total_amount,users.name",
        joins: [
          {
            table: "users",
            type: "INNER",
            on: "orders.user_id = users.id",
          },
        ],
        where: { "orders.status": "completed" },
        limit: 10,
      });
      console.log("Result:", joinResult.success ? "✅ Success" : "❌ Failed");
      console.log("Data:", joinResult.data?.length, "records\n");

      console.log("🎉 Test Suite Completed!");
    } catch (error) {
      console.error("❌ Test Suite Failed:", error);
    }
  }
}

// Export a default instance for convenience
export const queryTester = new QueryTester();

// Example usage:
// import { queryTester } from './queryTester';
// await queryTester.runTestSuite();
