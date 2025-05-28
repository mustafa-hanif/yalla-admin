import React, { useState } from "react";
import {
  useUserProfile,
  useUserProducts,
  useUserProductsInfinite,
  useLatestUserProducts,
  useUserAllData,
  useUserDashboard,
  useInvalidateUser,
  queryClient,
} from "../lib/queries";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface UserProductDemoProps {
  defaultUserId?: string;
}

export function UserProductDemo({
  defaultUserId = "123",
}: UserProductDemoProps) {
  const [userId, setUserId] = useState(defaultUserId);
  const [inputUserId, setInputUserId] = useState(defaultUserId);
  const { invalidateUser, invalidateUserProfile, invalidateUserProducts } =
    useInvalidateUser();

  // Different query hooks for demonstration
  const profileQuery = useUserProfile(userId);
  const productsQuery = useUserProducts(userId, { limit: 5 });
  const latestProductsQuery = useLatestUserProducts(userId, 3);
  const allDataQuery = useUserAllData(userId);
  const infiniteProductsQuery = useUserProductsInfinite(userId, { limit: 2 });
  const dashboardQuery = useUserDashboard(userId, 3);

  const handleUserChange = () => {
    setUserId(inputUserId);
  };

  const handleInvalidate = () => {
    invalidateUser(userId);
  };

  return (
    <div className="p-6 space-y-6 w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">TanStack Query Demo</h1>
        <div className="flex gap-2">
          <Input
            placeholder="User ID"
            value={inputUserId}
            onChange={(e) => setInputUserId(e.target.value)}
            className="w-32"
          />
          <Button onClick={handleUserChange}>Load User</Button>
          <Button onClick={handleInvalidate} variant="outline">
            Invalidate Cache
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>useUserProfile hook</CardDescription>
          </CardHeader>
          <CardContent>
            {profileQuery.isLoading && <p>Loading profile...</p>}
            {profileQuery.isError && (
              <p className="text-red-500">
                Error: {profileQuery.error?.message}
              </p>
            )}
            {profileQuery.data && (
              <div>
                <p>
                  <strong>Name:</strong>{" "}
                  {profileQuery.data.data?.name || "No name"}
                </p>
                <p>
                  <strong>PK:</strong> {profileQuery.data.data?.PK}
                </p>
                <p>
                  <strong>SK:</strong> {profileQuery.data.data?.SK}
                </p>
                <p>
                  <strong>Found:</strong> {String(profileQuery.data.found)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Products */}
        <Card>
          <CardHeader>
            <CardTitle>User Products (Paginated)</CardTitle>
            <CardDescription>useUserProducts hook (limit: 5)</CardDescription>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading && <p>Loading products...</p>}
            {productsQuery.isError && (
              <p className="text-red-500">
                Error: {productsQuery.error?.message}
              </p>
            )}
            {productsQuery.data && (
              <div>
                <p>
                  <strong>Count:</strong> {productsQuery.data.count}
                </p>
                <div className="space-y-2">
                  {productsQuery.data.data
                    ?.slice(0, 3)
                    .map((product: any, index: number) => (
                      <div key={index} className="p-2 bg-gray-50 rounded">
                        <p>
                          <strong>{product.name || product.productId}</strong>
                        </p>
                        <p className="text-sm text-gray-600">
                          {product.PK} | {product.SK}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Products */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Products</CardTitle>
            <CardDescription>
              useLatestUserProducts hook (limit: 3, reverse: true)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestProductsQuery.isLoading && <p>Loading latest products...</p>}
            {latestProductsQuery.isError && (
              <p className="text-red-500">
                Error: {latestProductsQuery.error?.message}
              </p>
            )}
            {latestProductsQuery.data && (
              <div>
                <p>
                  <strong>Count:</strong> {latestProductsQuery.data.count}
                </p>
                <div className="space-y-2">
                  {latestProductsQuery.data.data
                    ?.slice(0, 3)
                    .map((product: any, index: number) => (
                      <div key={index} className="p-2 bg-blue-50 rounded">
                        <p>
                          <strong>{product.name || product.productId}</strong>
                        </p>
                        <p className="text-sm text-gray-600">
                          {product.createdAt || "No date"}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Data */}
        <Card>
          <CardHeader>
            <CardTitle>User Dashboard</CardTitle>
            <CardDescription>
              useUserDashboard hook (profile + latest products)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading && <p>Loading dashboard...</p>}
            {dashboardQuery.isError && (
              <p className="text-red-500">
                Error: {dashboardQuery.error?.message}
              </p>
            )}
            {!dashboardQuery.isLoading && !dashboardQuery.isError && (
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold">Profile Status:</h4>
                  <p>
                    {dashboardQuery.profile.data?.found ? "Found" : "Not found"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Products Status:</h4>
                  <p>{dashboardQuery.products.data?.count || 0} products</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Infinite Query Demo */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Infinite Products</CardTitle>
          <CardDescription>
            useUserProductsInfinite hook with pagination
          </CardDescription>
        </CardHeader>
        <CardContent>
          {infiniteProductsQuery.isLoading && (
            <p>Loading infinite products...</p>
          )}
          {infiniteProductsQuery.isError && (
            <p className="text-red-500">
              Error: {infiniteProductsQuery.error?.message}
            </p>
          )}
          {infiniteProductsQuery.data && (
            <div>
              <div className="space-y-4">
                {infiniteProductsQuery.data.pages.map((page, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="border-l-4 border-green-400 pl-4"
                  >
                    <h4 className="font-semibold">
                      Page {pageIndex + 1} ({page.count} items)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {page.data
                        ?.slice(0, 4)
                        .map((product: any, index: number) => (
                          <div
                            key={index}
                            className="p-2 bg-green-50 rounded text-sm"
                          >
                            <p>
                              <strong>
                                {product.name || product.productId}
                              </strong>
                            </p>
                            <p className="text-gray-600">
                              {product.PK} | {product.SK}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => infiniteProductsQuery.fetchNextPage()}
                  disabled={
                    !infiniteProductsQuery.hasNextPage ||
                    infiniteProductsQuery.isFetchingNextPage
                  }
                >
                  {infiniteProductsQuery.isFetchingNextPage
                    ? "Loading more..."
                    : infiniteProductsQuery.hasNextPage
                      ? "Load More"
                      : "No more data"}
                </Button>

                {infiniteProductsQuery.isFetching &&
                  !infiniteProductsQuery.isFetchingNextPage && (
                    <span className="text-sm text-gray-500">
                      Background updating...
                    </span>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Data Query */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>All User Data</CardTitle>
          <CardDescription>
            useUserAllData hook (profile + all related entities)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allDataQuery.isLoading && <p>Loading all data...</p>}
          {allDataQuery.isError && (
            <p className="text-red-500">Error: {allDataQuery.error?.message}</p>
          )}
          {allDataQuery.data && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold">Profile</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(allDataQuery.data.data?.profile, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold">Related Entities</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(allDataQuery.data.data?.related, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold">Raw Data Count</h4>
                  <p>{allDataQuery.data.data?.raw?.length || 0} total items</p>
                  <p>Operation: {allDataQuery.data.operation}</p>
                  <p>Count: {allDataQuery.data.count}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Status */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Query Status Debug</CardTitle>
          <CardDescription>Current status of all queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Profile:</strong>
              <br />
              Loading: {String(profileQuery.isLoading)}
              <br />
              Error: {String(profileQuery.isError)}
              <br />
              Success: {String(profileQuery.isSuccess)}
            </div>
            <div>
              <strong>Products:</strong>
              <br />
              Loading: {String(productsQuery.isLoading)}
              <br />
              Error: {String(productsQuery.isError)}
              <br />
              Success: {String(productsQuery.isSuccess)}
            </div>
            <div>
              <strong>Latest:</strong>
              <br />
              Loading: {String(latestProductsQuery.isLoading)}
              <br />
              Error: {String(latestProductsQuery.isError)}
              <br />
              Success: {String(latestProductsQuery.isSuccess)}
            </div>
            <div>
              <strong>All Data:</strong>
              <br />
              Loading: {String(allDataQuery.isLoading)}
              <br />
              Error: {String(allDataQuery.isError)}
              <br />
              Success: {String(allDataQuery.isSuccess)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
