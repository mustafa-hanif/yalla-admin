import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseInfiniteQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000, // 5 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  },
});

// Types for our SQL query responses
interface SqlQueryResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  operation: string | null;
  table: string | null;
}

// Database entity interfaces
interface User {
  id: string;
  name: string;
  email: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
  description?: string;
  category?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

// Helper function to create query URLs
const createQueryUrl = (
  params: Record<string, string | number | boolean>
): URL => {
  const url = new URL(`${window.location.origin}/api/query`); // Base URL doesn't matter for generalQuery
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

// Base query function using generalQuery
async function executeQuery<T = any>(
  params: Record<string, string | number | boolean>
): Promise<SqlQueryResponse<T>> {
  const url = createQueryUrl(params);
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Query Keys Factory
export const queryKeys = {
  // User queries
  users: () => ["users"] as const,
  user: (userId: string) => ["users", userId] as const,
  usersByStatus: (status: string) => ["users", "status", status] as const,

  // Product queries
  products: () => ["products"] as const,
  product: (productId: string) => ["products", productId] as const,
  productsByUser: (userId: string) => ["products", "user", userId] as const,
  productsByCategory: (categoryId: string) =>
    ["products", "category", categoryId] as const,
  productsByStatus: (status: string) => ["products", "status", status] as const,

  // Category queries
  categories: () => ["categories"] as const,
  category: (categoryId: string) => ["categories", categoryId] as const,

  // Generic table queries
  table: (tableName: string) => ["table", tableName] as const,
  tableWithFilter: (tableName: string, filters: Record<string, any>) =>
    ["table", tableName, "filtered", filters] as const,
};

// =============================================================================
// USER QUERIES
// =============================================================================

/**
 * Get all users with optional filtering
 */
export function useUsers(
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
  },
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<User[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  const queryParams: Record<string, string | number> = {
    table: "users",
    operation: "select",
  };

  if (filters?.status) queryParams.where_status = filters.status;
  if (filters?.limit) queryParams.limit = filters.limit;
  if (filters?.offset) queryParams.offset = filters.offset;
  if (filters?.orderBy) queryParams.orderBy = filters.orderBy;
  if (filters?.orderDirection)
    queryParams.orderDirection = filters.orderDirection;

  return useQuery({
    queryKey: filters?.status
      ? queryKeys.usersByStatus(filters.status)
      : queryKeys.users(),
    queryFn: () => executeQuery<User[]>(queryParams),
    ...options,
  });
}

/**
 * Get a single user by ID
 */
export function useUser(
  userId: string,
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<User | null>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: async () => {
      const result = await executeQuery<User[]>({
        table: "users",
        operation: "select",
        where_id: userId,
      });

      return {
        ...result,
        data: result.data?.[0] || null, // Get first user from array
      };
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Get products for a specific user
 */
export function useUserProducts(
  userId: string,
  filters?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
  },
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<Product[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  const queryParams: Record<string, string | number> = {
    table: "products",
    operation: "select",
    where_user_id: userId,
  };

  if (filters?.status) queryParams.where_status = filters.status;
  if (filters?.category) queryParams.where_category = filters.category;
  if (filters?.limit) queryParams.limit = filters.limit;
  if (filters?.offset) queryParams.offset = filters.offset;
  if (filters?.orderBy) queryParams.orderBy = filters.orderBy;
  if (filters?.orderDirection)
    queryParams.orderDirection = filters.orderDirection;

  return useQuery({
    queryKey: queryKeys.productsByUser(userId),
    queryFn: () => executeQuery<Product[]>(queryParams),
    enabled: !!userId,
    ...options,
  });
}

// =============================================================================
// PRODUCT QUERIES
// =============================================================================

/**
 * Get all products with optional filtering
 */
export function useProducts(
  filters?: {
    status?: string;
    category?: string;
    user_id?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
  },
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<Product[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  const queryParams: Record<string, string | number> = {
    table: "products",
    operation: "select",
  };

  if (filters?.status) queryParams.where_status = filters.status;
  if (filters?.category) queryParams.where_category = filters.category;
  if (filters?.user_id) queryParams.where_user_id = filters.user_id;
  if (filters?.limit) queryParams.limit = filters.limit;
  if (filters?.offset) queryParams.offset = filters.offset;
  if (filters?.orderBy) queryParams.orderBy = filters.orderBy;
  if (filters?.orderDirection)
    queryParams.orderDirection = filters.orderDirection;

  return useQuery({
    queryKey: queryKeys.products(),
    queryFn: () => executeQuery<Product[]>(queryParams),
    ...options,
  });
}

/**
 * Get a single product by ID
 */
export function useProduct(
  productId: string,
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<Product | null>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: async () => {
      const result = await executeQuery<Product[]>({
        table: "products",
        operation: "select",
        where_id: productId,
      });

      return {
        ...result,
        data: result.data?.[0] || null, // Get first product from array
      };
    },
    enabled: !!productId,
    ...options,
  });
}

/**
 * Get products with user information using JOIN
 */
export function useProductsWithUsers(
  filters?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  },
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<any[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  const queryParams: Record<string, string | number> = {
    table: "products",
    operation: "select",
    columns:
      "products.id,products.name,products.price,products.status,users.name as user_name,users.email as user_email",
    join_0_table: "users",
    join_0_type: "LEFT",
    join_0_on: "products.user_id = users.id",
  };

  if (filters?.status) queryParams.where_status = filters.status;
  if (filters?.category) queryParams.where_category = filters.category;
  if (filters?.limit) queryParams.limit = filters.limit;
  if (filters?.offset) queryParams.offset = filters.offset;

  return useQuery({
    queryKey: ["products", "with-users", filters],
    queryFn: () => executeQuery<any[]>(queryParams),
    ...options,
  });
}

// =============================================================================
// CATEGORY QUERIES
// =============================================================================

/**
 * Get all categories
 */
export function useCategories(
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<Category[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () =>
      executeQuery<Category[]>({
        table: "categories",
        operation: "select",
        orderBy: "name",
        orderDirection: "ASC",
      }),
    ...options,
  });
}

/**
 * Get a single category by ID
 */
export function useCategory(
  categoryId: string,
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<Category | null>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.category(categoryId),
    queryFn: async () => {
      const result = await executeQuery<Category[]>({
        table: "categories",
        operation: "select",
        where_id: categoryId,
      });

      return {
        ...result,
        data: result.data?.[0] || null, // Get first category from array
      };
    },
    enabled: !!categoryId,
    ...options,
  });
}

// =============================================================================
// GENERIC TABLE QUERIES
// =============================================================================

/**
 * Generic hook to query any table
 */
export function useTable<T = any>(
  tableName: string,
  filters?: {
    where?: Record<string, any>;
    columns?: string[];
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: "ASC" | "DESC";
    joins?: Array<{
      table: string;
      type: "INNER" | "LEFT" | "RIGHT" | "FULL";
      on: string;
    }>;
  },
  options?: Omit<
    UseQueryOptions<SqlQueryResponse<T[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  const queryParams: Record<string, string | number> = {
    table: tableName,
    operation: "select",
  };

  // Add WHERE conditions
  if (filters?.where) {
    Object.entries(filters.where).forEach(([key, value]) => {
      queryParams[`where_${key}`] = value;
    });
  }

  // Add other filters
  if (filters?.columns) queryParams.columns = filters.columns.join(",");
  if (filters?.limit) queryParams.limit = filters.limit;
  if (filters?.offset) queryParams.offset = filters.offset;
  if (filters?.orderBy) queryParams.orderBy = filters.orderBy;
  if (filters?.orderDirection)
    queryParams.orderDirection = filters.orderDirection;

  // Add joins
  if (filters?.joins) {
    filters.joins.forEach((join, index) => {
      queryParams[`join_${index}_table`] = join.table;
      queryParams[`join_${index}_type`] = join.type;
      queryParams[`join_${index}_on`] = join.on;
    });
  }

  return useQuery({
    queryKey: filters
      ? queryKeys.tableWithFilter(tableName, filters)
      : queryKeys.table(tableName),
    queryFn: () => executeQuery<T[]>(queryParams),
    enabled: !!tableName,
    ...options,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new user
 */
export function useCreateUser(
  options?: UseMutationOptions<
    SqlQueryResponse<User[]>,
    Error,
    Omit<User, "id" | "created_at" | "updated_at">
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData) =>
      executeQuery<User[]>({
        table: "users",
        operation: "insert",
        data_name: userData.name,
        data_email: userData.email,
        data_status: userData.status || "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
    ...options,
  });
}

/**
 * Update a user
 */
export function useUpdateUser(
  options?: UseMutationOptions<
    SqlQueryResponse<User[]>,
    Error,
    { id: string; data: Partial<User> }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
      const updateParams: Record<string, string | number> = {
        table: "users",
        operation: "update",
        where_id: id,
      };

      // Add data fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== "id") {
          updateParams[`data_${key}`] = String(value);
        }
      });

      return executeQuery<User[]>(updateParams);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
    },
    ...options,
  });
}

/**
 * Delete a user
 */
export function useDeleteUser(
  options?: UseMutationOptions<SqlQueryResponse<User[]>, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) =>
      executeQuery<User[]>({
        table: "users",
        operation: "delete",
        where_id: userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
    ...options,
  });
}

/**
 * Create a new product
 */
export function useCreateProduct(
  options?: UseMutationOptions<
    SqlQueryResponse<Product[]>,
    Error,
    Omit<Product, "id" | "created_at" | "updated_at">
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData) => {
      const createParams: Record<string, string | number> = {
        table: "products",
        operation: "insert",
        data_name: productData.name,
      };

      // Add optional fields
      if (productData.price) createParams.data_price = productData.price;
      if (productData.description)
        createParams.data_description = productData.description;
      if (productData.category)
        createParams.data_category = productData.category;
      if (productData.user_id) createParams.data_user_id = productData.user_id;
      if (productData.status) createParams.data_status = productData.status;

      return executeQuery<Product[]>(createParams);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
    ...options,
  });
}

/**
 * Update a product
 */
export function useUpdateProduct(
  options?: UseMutationOptions<
    SqlQueryResponse<Product[]>,
    Error,
    { id: string; data: Partial<Product> }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
      const updateParams: Record<string, string | number> = {
        table: "products",
        operation: "update",
        where_id: id,
      };

      // Add data fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== "id") {
          updateParams[`data_${key}`] = String(value);
        }
      });

      return executeQuery<Product[]>(updateParams);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(id) });
    },
    ...options,
  });
}

/**
 * Delete a product
 */
export function useDeleteProduct(
  options?: UseMutationOptions<SqlQueryResponse<Product[]>, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId) =>
      executeQuery<Product[]>({
        table: "products",
        operation: "delete",
        where_id: productId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
    ...options,
  });
}

// =============================================================================
// CONVENIENCE HOOKS FOR COMMON PATTERNS
// =============================================================================

/**
 * Get user and their products in a single hook
 */
export function useUserDashboard(userId: string, productLimit: number = 5) {
  const userQuery = useUser(userId);
  const productsQuery = useUserProducts(userId, {
    limit: productLimit,
    orderBy: "created_at",
    orderDirection: "DESC",
  });

  return {
    user: userQuery,
    products: productsQuery,
    isLoading: userQuery.isLoading || productsQuery.isLoading,
    isError: userQuery.isError || productsQuery.isError,
    error: userQuery.error || productsQuery.error,
  };
}

/**
 * Get products with category information
 */
export function useProductsWithCategories(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useTable("products", {
    columns: [
      "products.id",
      "products.name",
      "products.price",
      "products.status",
      "categories.name as category_name",
    ],
    joins: [
      {
        table: "categories",
        type: "LEFT",
        on: "products.category = categories.id",
      },
    ],
    where: filters?.status ? { status: filters.status } : undefined,
    limit: filters?.limit,
    offset: filters?.offset,
    orderBy: "products.created_at",
    orderDirection: "DESC",
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper to invalidate queries
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
    invalidateUser: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    },
    invalidateProducts: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
    invalidateProduct: (productId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
    },
    invalidateCategories: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
    invalidateCategory: (categoryId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.category(categoryId),
      });
    },
    invalidateTable: (tableName: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.table(tableName) });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}
