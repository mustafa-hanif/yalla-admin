// Type definitions for the general query engine

export interface QueryParams {
  table: string;
  operation: "select" | "insert" | "update" | "delete";
  columns?: string[];
  where?: Record<string, any>;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
  data?: Record<string, any>;
  joins?: JoinConfig[];
}

export interface JoinConfig {
  table: string;
  type: "INNER" | "LEFT" | "RIGHT" | "FULL";
  on: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  operation: string | null;
  table: string | null;
}

export interface QueryBuilder {
  query: string;
  values: any[];
}

// Utility types for URL parameter parsing
export type WhereParams = Record<`where_${string}`, string>;
export type DataParams = Record<`data_${string}`, string>;
export type JoinParams = Record<
  `join_${number}_${"table" | "type" | "on"}`,
  string
>;

// Helper function types
export type ParseUrlParams = (url: URL) => QueryParams;
export type BuildSelectQuery = (params: QueryParams) => QueryBuilder;
export type BuildInsertQuery = (params: QueryParams) => QueryBuilder;
export type BuildUpdateQuery = (params: QueryParams) => QueryBuilder;
export type BuildDeleteQuery = (params: QueryParams) => QueryBuilder;

// Main function type
export type GeneralQuery = (url: URL) => Promise<QueryResult>;
