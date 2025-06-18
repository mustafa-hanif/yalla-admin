import React, { useState } from "react";
import {
  useUser,
  useUsers,
  useUserProducts,
  useProducts,
  useUserDashboard,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useInvalidateQueries,
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
  const { invalidateUser, invalidateUsers, invalidateProducts } =
    useInvalidateQueries();

  // Different query hooks for demonstration
  const userQuery = useUser(userId);
  const productsQuery = useUserProducts(userId, { limit: 5 });
  const allUsersQuery = useUsers({ limit: 10 });
  const allProductsQuery = useProducts({ limit: 10 });
  const dashboardQuery = useUserDashboard(userId, 3);

  // Mutation hooks for demonstration
  const createUser = useCreateUser({
    onSuccess: () => {
      console.log("User created successfully");
    },
  });

  const handleUserChange = () => {
    setUserId(inputUserId);
  };

  const handleInvalidate = () => {
    invalidateUser(userId);
  };

  const handleCreateUser = () => {
    createUser.mutate({
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      status: "active",
    });
  };

  return (
    <div className="p-6 space-y-6 w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">SQL Query Demo</h1>
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
          <Button onClick={handleCreateUser} variant="secondary">
            Create Test User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single User */}
        <Card>
          <CardHeader>
            <CardTitle>Single User</CardTitle>
            <CardDescription>useUser hook</CardDescription>
          </CardHeader>
          <CardContent>
            {userQuery.isLoading && <p>Loading user...</p>}
            {userQuery.isError && (
              <p className="text-red-500">Error: {userQuery.error?.message}</p>
            )}
            {userQuery.data?.data && (
              <div>
                <p>
                  <strong>ID:</strong> {userQuery.data.data.id}
                </p>
                <p>
                  <strong>Name:</strong> {userQuery.data.data.name}
                </p>
                <p>
                  <strong>Email:</strong> {userQuery.data.data.email}
                </p>
                <p>
                  <strong>Status:</strong> {userQuery.data.data.status}
                </p>
                <p>
                  <strong>Created:</strong> {userQuery.data.data.created_at}
                </p>
              </div>
            )}
            {userQuery.data && !userQuery.data.data && (
              <p className="text-yellow-600">User not found</p>
            )}
          </CardContent>
        </Card>

        {/* User Products */}
        <Card>
          <CardHeader>
            <CardTitle>User Products</CardTitle>
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
                  <strong>Count:</strong> {productsQuery.data.data?.length || 0}
                </p>
                <div className="space-y-2">
                  {productsQuery.data.data
                    ?.slice(0, 3)
                    .map((product, index) => (
                      <div
                        key={product.id || index}
                        className="p-2 bg-gray-50 rounded"
                      >
                        <p>
                          <strong>{product.name}</strong>
                        </p>
                        <p className="text-sm text-gray-600">
                          ID: {product.id} | Price: ${product.price}
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: {product.status}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>useUsers hook (limit: 10)</CardDescription>
          </CardHeader>
          <CardContent>
            {allUsersQuery.isLoading && <p>Loading users...</p>}
            {allUsersQuery.isError && (
              <p className="text-red-500">
                Error: {allUsersQuery.error?.message}
              </p>
            )}
            {allUsersQuery.data && (
              <div>
                <p>
                  <strong>Count:</strong> {allUsersQuery.data.data?.length || 0}
                </p>
                <div className="space-y-2">
                  {allUsersQuery.data.data?.slice(0, 3).map((user, index) => (
                    <div
                      key={user.id || index}
                      className="p-2 bg-blue-50 rounded"
                    >
                      <p>
                        <strong>{user.name}</strong>
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-600">
                        Status: {user.status}
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
              useUserDashboard hook (user + products)
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
                  <h4 className="font-semibold">User Status:</h4>
                  <p>
                    {dashboardQuery.user.data?.data ? "Found" : "Not found"}
                  </p>
                  {dashboardQuery.user.data?.data && (
                    <p className="text-sm text-gray-600">
                      {dashboardQuery.user.data.data.name}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold">Products:</h4>
                  <p>
                    {dashboardQuery.products.data?.data?.length || 0} products
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Products */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>useProducts hook with pagination</CardDescription>
        </CardHeader>
        <CardContent>
          {allProductsQuery.isLoading && <p>Loading all products...</p>}
          {allProductsQuery.isError && (
            <p className="text-red-500">
              Error: {allProductsQuery.error?.message}
            </p>
          )}
          {allProductsQuery.data && (
            <div>
              <p className="mb-4">
                <strong>Total Products:</strong>{" "}
                {allProductsQuery.data.data?.length || 0}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allProductsQuery.data.data
                  ?.slice(0, 6)
                  .map((product, index) => (
                    <div
                      key={product.id || index}
                      className="p-3 bg-green-50 rounded border"
                    >
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        Price: ${product.price}
                      </p>
                      <p className="text-sm text-gray-600">
                        Category: {product.category}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {product.status}
                      </p>
                      <p className="text-xs text-gray-500">
                        User: {product.user_id}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mutation Status */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Mutation Status</CardTitle>
          <CardDescription>Create user mutation status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Create User Status:</strong>{" "}
              {createUser.isPending
                ? "Creating..."
                : createUser.isSuccess
                  ? "Success!"
                  : createUser.isError
                    ? "Error"
                    : "Ready"}
            </p>
            {createUser.isError && (
              <p className="text-red-500">Error: {createUser.error?.message}</p>
            )}
            {createUser.isSuccess && createUser.data && (
              <p className="text-green-600">
                User created successfully! Operation:{" "}
                {createUser.data.operation}
              </p>
            )}
          </div>
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
              <strong>Single User:</strong>
              <br />
              Loading: {String(userQuery.isLoading)}
              <br />
              Error: {String(userQuery.isError)}
              <br />
              Success: {String(userQuery.isSuccess)}
            </div>
            <div>
              <strong>User Products:</strong>
              <br />
              Loading: {String(productsQuery.isLoading)}
              <br />
              Error: {String(productsQuery.isError)}
              <br />
              Success: {String(productsQuery.isSuccess)}
            </div>
            <div>
              <strong>All Users:</strong>
              <br />
              Loading: {String(allUsersQuery.isLoading)}
              <br />
              Error: {String(allUsersQuery.isError)}
              <br />
              Success: {String(allUsersQuery.isSuccess)}
            </div>
            <div>
              <strong>All Products:</strong>
              <br />
              Loading: {String(allProductsQuery.isLoading)}
              <br />
              Error: {String(allProductsQuery.isError)}
              <br />
              Success: {String(allProductsQuery.isSuccess)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
