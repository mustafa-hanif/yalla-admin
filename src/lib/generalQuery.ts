import { sql } from "bun";

interface QueryParams {
  table: string;
  operation: "select" | "insert" | "update" | "delete";
  columns?: string[];
  where?: Record<string, any>;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
  data?: Record<string, any>;
  joins?: Array<{
    table: string;
    type: "INNER" | "LEFT" | "RIGHT" | "FULL";
    on: string;
  }>;
}

const parseUrlParams = (url: URL): QueryParams => {
  const params = new URLSearchParams(url.search);

  // Required parameters
  const table = params.get("table");
  const operation = params.get("operation") as QueryParams["operation"];

  if (!table || !operation) {
    throw new Error("Missing required parameters: table and operation");
  }

  // Optional parameters
  const columns = params
    .get("columns")
    ?.split(",")
    .map((col) => col.trim());
  const orderBy = params.get("orderBy");
  const orderDirection =
    (params.get("orderDirection")?.toUpperCase() as "ASC" | "DESC") || "ASC";
  const limit = params.get("limit")
    ? parseInt(params.get("limit")!)
    : undefined;
  const offset = params.get("offset")
    ? parseInt(params.get("offset")!)
    : undefined;

  // Parse WHERE conditions
  const where: Record<string, any> = {};
  const paramEntries = Array.from(params.entries());
  for (const [key, value] of paramEntries) {
    if (key.startsWith("where_")) {
      const column = key.replace("where_", "");
      where[column] = value;
    }
  }

  // Parse data for INSERT/UPDATE operations
  const data: Record<string, any> = {};
  for (const [key, value] of paramEntries) {
    if (key.startsWith("data_")) {
      const column = key.replace("data_", "");
      data[column] = value;
    }
  }

  // Parse joins
  const joins: Array<{
    table: string;
    type: "INNER" | "LEFT" | "RIGHT" | "FULL";
    on: string;
  }> = [];
  const joinParams = Array.from(params.entries()).filter(([key]) =>
    key.startsWith("join_")
  );

  for (const [key, value] of joinParams) {
    const joinIndex = key.split("_")[1];
    const joinProperty = key.split("_")[2];

    if (!joins[parseInt(joinIndex)]) {
      joins[parseInt(joinIndex)] = { table: "", type: "INNER", on: "" };
    }

    if (joinProperty === "table") {
      joins[parseInt(joinIndex)].table = value;
    } else if (joinProperty === "type") {
      joins[parseInt(joinIndex)].type = value.toUpperCase() as
        | "INNER"
        | "LEFT"
        | "RIGHT"
        | "FULL";
    } else if (joinProperty === "on") {
      joins[parseInt(joinIndex)].on = value;
    }
  }

  return {
    table,
    operation,
    columns,
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy,
    orderDirection,
    limit,
    offset,
    data: Object.keys(data).length > 0 ? data : undefined,
    joins: joins.filter((join) => join.table && join.on),
  };
};

const buildSelectQuery = (
  params: QueryParams
): { query: string; values: any[] } => {
  const {
    table,
    columns,
    where,
    orderBy,
    orderDirection,
    limit,
    offset,
    joins,
  } = params;

  let query = "SELECT ";
  query += columns && columns.length > 0 ? columns.join(", ") : "*";
  query += ` FROM ${table}`;

  // Add joins
  if (joins && joins.length > 0) {
    for (const join of joins) {
      query += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }
  }

  const values: any[] = [];

  // Add WHERE clause
  if (where && Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map((key, index) => {
      values.push(where[key]);
      return `${key} = $${values.length}`;
    });
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  // Add ORDER BY
  if (orderBy) {
    query += ` ORDER BY ${orderBy} ${orderDirection}`;
  }

  // Add LIMIT and OFFSET
  if (limit) {
    values.push(limit);
    query += ` LIMIT $${values.length}`;
  }

  if (offset) {
    values.push(offset);
    query += ` OFFSET $${values.length}`;
  }

  return { query, values };
};

const buildInsertQuery = (
  params: QueryParams
): { query: string; values: any[] } => {
  const { table, data } = params;

  if (!data || Object.keys(data).length === 0) {
    throw new Error("INSERT operation requires data parameters");
  }

  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, index) => `$${index + 1}`);

  const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;

  return { query, values };
};

const buildUpdateQuery = (
  params: QueryParams
): { query: string; values: any[] } => {
  const { table, data, where } = params;

  if (!data || Object.keys(data).length === 0) {
    throw new Error("UPDATE operation requires data parameters");
  }

  if (!where || Object.keys(where).length === 0) {
    throw new Error("UPDATE operation requires WHERE conditions for safety");
  }

  const values: any[] = [];

  // Build SET clause
  const setClauses = Object.keys(data).map((key) => {
    values.push(data[key]);
    return `${key} = $${values.length}`;
  });

  let query = `UPDATE ${table} SET ${setClauses.join(", ")}`;

  // Build WHERE clause
  const conditions = Object.keys(where).map((key) => {
    values.push(where[key]);
    return `${key} = $${values.length}`;
  });
  query += ` WHERE ${conditions.join(" AND ")}`;
  query += " RETURNING *";

  return { query, values };
};

const buildDeleteQuery = (
  params: QueryParams
): { query: string; values: any[] } => {
  const { table, where } = params;

  if (!where || Object.keys(where).length === 0) {
    throw new Error("DELETE operation requires WHERE conditions for safety");
  }

  const values: any[] = [];
  const conditions = Object.keys(where).map((key) => {
    values.push(where[key]);
    return `${key} = $${values.length}`;
  });

  const query = `DELETE FROM ${table} WHERE ${conditions.join(" AND ")} RETURNING *`;

  return { query, values };
};

const generalQuery = async (url: URL) => {
  try {
    const params = parseUrlParams(url);
    let queryData: { query: string; values: any[] };

    switch (params.operation) {
      case "select":
        queryData = buildSelectQuery(params);
        break;
      case "insert":
        queryData = buildInsertQuery(params);
        break;
      case "update":
        queryData = buildUpdateQuery(params);
        break;
      case "delete":
        queryData = buildDeleteQuery(params);
        break;
      default:
        throw new Error(`Unsupported operation: ${params.operation}`);
    }

    console.log("Executing query:", queryData.query);
    console.log("With values:", queryData.values);

    const result = await sql.unsafe(queryData.query, queryData.values);
    return {
      success: true,
      data: result,
      operation: params.operation,
      table: params.table,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      operation: null,
      table: null,
    };
  }
};

export default generalQuery;
