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
} from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
    },
  },
});

// Types for our API responses
interface ApiResponse<T = any> {
  operation: string;
  data: T;
  count?: number;
  scannedCount?: number;
  partitionKey?: string;
  entityType?: string;
  entityId?: string;
  nextStartKey?: string;
  found?: boolean;
  queryOptions?: {
    limit: number;
    reverse: boolean;
    attributes?: string[];
  };
  error?: string;
  details?: string;
}

interface UserProfile {
  PK: string;
  SK: string;
  name: string;
}

interface Product {
  PK: string;
  SK: string;
  productId: string;
  name: string;
  price?: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserData {
  profile: UserProfile | null;
  related: {
    Product?: Product[];
    [key: string]: any[];
  };
  raw: any[];
}

// Helper function to properly encode partition keys
const encodeKey = (key: string) => encodeURIComponent(key);

// Base API function
async function apiQuery<T = any>(
  params: Record<string, string | number | boolean>
): Promise<ApiResponse<T>> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const response = await fetch(`/api/query?${searchParams}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Query Keys Factory
export const queryKeys = {
  // User queries
  user: (userId: string) => ["user", userId] as const,
  userProfile: (userId: string) => ["user", userId, "profile"] as const,
  userProducts: (
    userId: string,
    options?: { limit?: number; reverse?: boolean }
  ) => ["user", userId, "products", options] as const,
  userAllData: (userId: string) => ["user", userId, "all"] as const,

  // Generic entity queries
  entity: (entityType: string, entityId: string) =>
    ["entity", entityType, entityId] as const,
  entityProfile: (entityType: string, entityId: string) =>
    ["entity", entityType, entityId, "profile"] as const,
  entityRelated: (
    entityType: string,
    entityId: string,
    targetEntity: string,
    options?: any
  ) =>
    ["entity", entityType, entityId, "related", targetEntity, options] as const,

  // Direct queries
  directQuery: (partitionKey: string, options?: any) =>
    ["direct", partitionKey, options] as const,
};

// =============================================================================
// USER QUERIES
// =============================================================================

/**
 * Get user profile by user ID
 */
export function useUserProfile(
  userId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<UserProfile>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: () =>
      apiQuery<UserProfile>({
        operation: "getItem",
        partitionKey: `User#${userId}`,
        sortKey: "Profile",
      }),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Get user products with pagination support
 */
export function useUserProducts(
  userId: string,
  queryOptions?: {
    limit?: number;
    reverse?: boolean;
    attributes?: string[];
  },
  options?: Omit<
    UseQueryOptions<ApiResponse<Product[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.userProducts(userId, queryOptions),
    queryFn: () =>
      apiQuery<Product[]>({
        operation: "queryRelated",
        entityType: "User",
        entityId: userId,
        targetEntity: "Product",
        ...(queryOptions?.limit && { limit: queryOptions.limit }),
        ...(queryOptions?.reverse !== undefined && {
          reverse: queryOptions.reverse,
        }),
        ...(queryOptions?.attributes && {
          attributes: queryOptions.attributes.join(","),
        }),
      }),
    enabled: !!userId,

    ...options,
  });
}

/**
 * Get user products with infinite pagination
 */
export function useUserProductsInfinite(
  userId: string,
  queryOptions?: {
    limit?: number;
    reverse?: boolean;
    attributes?: string[];
  }
) {
  return useInfiniteQuery({
    queryKey: queryKeys.userProducts(userId, queryOptions),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      apiQuery<Product[]>({
        operation: "queryRelated",
        entityType: "User",
        entityId: userId,
        targetEntity: "Product",
        limit: queryOptions?.limit || 10,
        ...(queryOptions?.reverse !== undefined && {
          reverse: queryOptions.reverse,
        }),
        ...(queryOptions?.attributes && {
          attributes: queryOptions.attributes.join(","),
        }),
        ...(pageParam && { startKey: pageParam }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ApiResponse<Product[]>) =>
      lastPage.nextStartKey || undefined,
    enabled: !!userId,
  });
}

/**
 * Get latest user products (newest first)
 */
export function useLatestUserProducts(
  userId: string,
  limit: number = 5,
  options?: Omit<
    UseQueryOptions<ApiResponse<Product[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.userProducts(userId, { limit, reverse: true }),
    queryFn: () =>
      apiQuery<Product[]>({
        operation: "queryRelated",
        entityType: "User",
        entityId: userId,
        targetEntity: "Product",
        limit,
        reverse: true,
      }),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Get all user data (profile + all related entities)
 */
export function useUserAllData(
  userId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<UserData>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.userAllData(userId),
    queryFn: () =>
      apiQuery<UserData>({
        operation: "queryAll",
        entityType: "User",
        entityId: userId,
      }),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Get user products within a time range
 */
export function useUserProductsTimeRange(
  userId: string,
  startTime: string,
  endTime: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<Product[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["user", userId, "products", "timerange", startTime, endTime],
    queryFn: () =>
      apiQuery<Product[]>({
        operation: "queryTimeRange",
        partitionKey: `User#${userId}`,
        startTime,
        endTime,
        rangePrefix: "Product#",
      }),
    enabled: !!userId && !!startTime && !!endTime,
    ...options,
  });
}

// =============================================================================
// GENERIC ENTITY QUERIES
// =============================================================================

/**
 * Generic function to get any entity profile
 */
export function useEntityProfile<T = any>(
  entityType: string,
  entityId: string,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.entityProfile(entityType, entityId),
    queryFn: () =>
      apiQuery<T>({
        operation: "getItem",
        partitionKey: `${entityType}#${entityId}`,
        sortKey: "Profile",
      }),
    enabled: !!entityType && !!entityId,
    ...options,
  });
}

/**
 * Generic function to get related entities
 */
export function useEntityRelated<T = any>(
  entityType: string,
  entityId: string,
  targetEntity: string,
  queryOptions?: {
    limit?: number;
    reverse?: boolean;
    attributes?: string[];
  },
  options?: Omit<
    UseQueryOptions<ApiResponse<T[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.entityRelated(
      entityType,
      entityId,
      targetEntity,
      queryOptions
    ),
    queryFn: () =>
      apiQuery<T[]>({
        operation: "queryRelated",
        entityType,
        entityId,
        targetEntity,
        ...(queryOptions?.limit && { limit: queryOptions.limit }),
        ...(queryOptions?.reverse !== undefined && {
          reverse: queryOptions.reverse,
        }),
        ...(queryOptions?.attributes && {
          attributes: queryOptions.attributes.join(","),
        }),
      }),
    enabled: !!entityType && !!entityId && !!targetEntity,
    ...options,
  });
}

/**
 * Generic direct query with partition key and sort key pattern
 */
export function useDirectQuery<T = any>(
  /**
   * partitionKey: e.g. "User#123" or "Product#456"
   */
  partitionKey: string,
  /**
   * sortKeyPattern: e.g. "Product#" to match all products under the user
   * or "Profile" for a single profile item
   */
  sortKeyPattern?: string,
  /**
   * queryOptions: additional options like limit, reverse, attributes, rangeStart, rangeEnd
   */
  queryOptions?: {
    limit?: number;
    reverse?: boolean;
    attributes?: string[];
    rangeStart?: string;
    rangeEnd?: string;
  },
  /**
   * options: additional query options
   */
  options?: Omit<
    UseQueryOptions<ApiResponse<T[]>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.directQuery(partitionKey, {
      sortKeyPattern,
      ...queryOptions,
    }),
    queryFn: () =>
      apiQuery<T[]>({
        operation: "query",
        partitionKey,
        ...(sortKeyPattern && { sortKeyPattern }),
        ...(queryOptions?.limit && { limit: queryOptions.limit }),
        ...(queryOptions?.reverse !== undefined && {
          reverse: queryOptions.reverse,
        }),
        ...(queryOptions?.attributes && {
          attributes: queryOptions.attributes.join(","),
        }),
        ...(queryOptions?.rangeStart && {
          rangeStart: queryOptions.rangeStart,
        }),
        ...(queryOptions?.rangeEnd && { rangeEnd: queryOptions.rangeEnd }),
      }),
    enabled: !!partitionKey,
    ...options,
  });
}

// =============================================================================
// CONVENIENCE HOOKS FOR COMMON PATTERNS
// =============================================================================

/**
 * Get user profile and latest products in a single hook
 */
export function useUserDashboard(userId: string, productLimit: number = 5) {
  const profileQuery = useUserProfile(userId);
  const productsQuery = useLatestUserProducts(userId, productLimit);

  return {
    profile: profileQuery,
    products: productsQuery,
    isLoading: profileQuery.isLoading || productsQuery.isLoading,
    isError: profileQuery.isError || productsQuery.isError,
    error: profileQuery.error || productsQuery.error,
  };
}

/**
 * Search products across all users (example of direct query usage)
 */
export function useProductSearch(
  categoryKey: string,
  searchOptions?: {
    limit?: number;
    reverse?: boolean;
  }
) {
  return useDirectQuery(
    categoryKey, // e.g., "Category#Electronics"
    "Product#",
    searchOptions
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper to invalidate all user-related queries
 */
export function useInvalidateUser() {
  const queryClient = useQueryClient();

  return {
    invalidateUser: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    },
    invalidateUserProfile: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(userId),
      });
    },
    invalidateUserProducts: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProducts(userId),
      });
    },
    invalidateAllUsers: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  };
}
