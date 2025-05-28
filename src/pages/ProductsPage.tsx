import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { useDirectQuery, useUserProducts } from "@/lib/queries";
import { columns } from "@/components/ProductColumns";
import type { Product } from "@/components/ProductColumns";

export function ProductsPage() {
  // Using sample user for demo - in real app this would come from auth context
  const {
    data: apiProducts,
    isLoading,
    error,
  } = useDirectQuery("User#1", "Product#");

  // For demo purposes, use mock data if API data is empty or has errors
  const products: Product[] =
    apiProducts?.data && apiProducts.data.length > 0
      ? apiProducts.data.map(
          (p) =>
            ({
              ...p,
              status: (p as any).status || "active",
              stock: (p as any).stock || 0,
              category: (p as any).category,
            }) as Product
        )
      : null;

  if (error && !products?.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">
              Error Loading Products
            </CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load products"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading && !products?.length) {
    return (
      <div className="flex items-center justify-center h-96 w-6xl">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Loading Products...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-6 w-6xl">
      {/* Admin Header */}
      <div className="admin-header bg-card rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Product Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your product inventory, pricing, and availability
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Export Data
            </Button>
            <Button size="sm">Add Product</Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-700">
                {products.length}
              </div>
              <div className="text-sm text-blue-600">Total Products</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-700">
                {products.filter((p) => p.status === "active").length}
              </div>
              <div className="text-sm text-green-600">Active Products</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-700">
                {products.filter((p) => (p.stock || 0) <= 10).length}
              </div>
              <div className="text-sm text-yellow-600">Low Stock</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-700">
                $
                {products
                  .reduce((sum, p) => sum + (p.price || 0), 0)
                  .toFixed(2)}
              </div>
              <div className="text-sm text-purple-600">Total Value</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Products Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Product Inventory</CardTitle>
              <CardDescription>
                View, search, and manage all products in your system
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {products.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={products || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
