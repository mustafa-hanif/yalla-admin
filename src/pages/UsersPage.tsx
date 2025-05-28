import { UserProductDemo } from "../components/UserProductDemo";

export function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground text-lg">
          Manage users and their products with TanStack Query
        </p>
      </div>

      <UserProductDemo defaultUserId="1" />
    </div>
  );
}
