// Example usage of the updated React Query hooks with SQL-based general query engine

import React from "react";
import {
  useUsers,
  useUser,
  useProducts,
  useUserProducts,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useUserDashboard,
  useProductsWithCategories,
  useTable,
} from "../lib/queries";

// =============================================================================
// BASIC QUERY EXAMPLES
// =============================================================================

/**
 * Example: List all users
 */
export const UsersList: React.FC = () => {
  const {
    data: response,
    isLoading,
    error,
  } = useUsers({
    status: "active",
    limit: 10,
    orderBy: "created_at",
    orderDirection: "DESC",
  });

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Active Users ({response?.data?.length || 0})</h2>
      <ul>
        {response?.data?.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Example: Single user profile
 */
export const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: response, isLoading, error } = useUser(userId);

  if (isLoading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!response?.data) return <div>User not found</div>;

  const user = response.data;

  return (
    <div>
      <h2>User Profile</h2>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Status: {user.status}</p>
      <p>Created: {user.created_at}</p>
    </div>
  );
};

/**
 * Example: User's products
 */
export const UserProducts: React.FC<{ userId: string }> = ({ userId }) => {
  const {
    data: response,
    isLoading,
    error,
  } = useUserProducts(userId, {
    status: "active",
    limit: 20,
    orderBy: "created_at",
    orderDirection: "DESC",
  });

  if (isLoading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>User Products ({response?.data?.length || 0})</h3>
      <div className="grid">
        {response?.data?.map((product) => (
          <div key={product.id} className="product-card">
            <h4>{product.name}</h4>
            <p>${product.price}</p>
            <p>{product.description}</p>
            <span>Status: {product.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// MUTATION EXAMPLES
// =============================================================================

/**
 * Example: Create user form
 */
export const CreateUserForm: React.FC = () => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const createUser = useCreateUser({
    onSuccess: () => {
      alert("User created successfully!");
      setName("");
      setEmail("");
    },
    onError: (error) => {
      alert(`Error creating user: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({ name, email, status: "active" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create New User</h3>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
};

/**
 * Example: Update user
 */
export const UpdateUserForm: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: userResponse } = useUser(userId);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const updateUser = useUpdateUser({
    onSuccess: () => {
      alert("User updated successfully!");
    },
  });

  React.useEffect(() => {
    if (userResponse?.data) {
      setName(userResponse.data.name);
      setEmail(userResponse.data.email);
    }
  }, [userResponse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({
      id: userId,
      data: { name, email },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Update User</h3>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" disabled={updateUser.isPending}>
        {updateUser.isPending ? "Updating..." : "Update User"}
      </button>
    </form>
  );
};

// =============================================================================
// ADVANCED EXAMPLES
// =============================================================================

/**
 * Example: User dashboard with user info and their products
 */
export const UserDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const { user, products, isLoading, error } = useUserDashboard(userId, 5);

  if (isLoading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>User Dashboard</h2>

      {/* User Info */}
      {user.data?.data && (
        <div className="user-info">
          <h3>{user.data.data.name}</h3>
          <p>{user.data.data.email}</p>
        </div>
      )}

      {/* Recent Products */}
      <div className="recent-products">
        <h3>Recent Products</h3>
        {products.data?.data?.map((product) => (
          <div key={product.id}>
            <h4>{product.name}</h4>
            <p>${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example: Products with category names using JOIN
 */
export const ProductsWithCategories: React.FC = () => {
  const {
    data: response,
    isLoading,
    error,
  } = useProductsWithCategories({
    status: "active",
    limit: 50,
  });

  if (isLoading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Products with Categories</h2>
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Price</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {response?.data?.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>${item.price}</td>
              <td>{item.category_name || "No Category"}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Example: Generic table query
 */
export const CustomTableQuery: React.FC = () => {
  const {
    data: response,
    isLoading,
    error,
  } = useTable("orders", {
    columns: [
      "orders.id",
      "orders.total",
      "orders.status",
      "users.name as customer_name",
    ],
    joins: [
      {
        table: "users",
        type: "INNER",
        on: "orders.user_id = users.id",
      },
    ],
    where: {
      status: "completed",
    },
    orderBy: "orders.created_at",
    orderDirection: "DESC",
    limit: 100,
  });

  if (isLoading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Completed Orders</h2>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {response?.data?.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer_name}</td>
              <td>${order.total}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// USAGE NOTES
// =============================================================================

/*
Key Features of the Updated React Query Hooks:

1. **SQL-Based**: All queries now use the generalQuery engine with SQL
2. **Type Safe**: Full TypeScript support with proper types
3. **Flexible Filtering**: WHERE conditions, ORDER BY, LIMIT, OFFSET
4. **JOIN Support**: Complex queries with table joins
5. **CRUD Operations**: Full Create, Read, Update, Delete support
6. **Optimistic Updates**: Automatic cache invalidation
7. **Generic Table Queries**: Query any table with custom parameters

URL Examples Generated:
- /api/query?table=users&operation=select&where_status=active&limit=10
- /api/query?table=products&operation=insert&data_name=New Product&data_price=29.99
- /api/query?table=products&operation=select&join_0_table=categories&join_0_type=LEFT&join_0_on=products.category=categories.id

The hooks automatically:
- Handle loading and error states
- Provide proper TypeScript types
- Invalidate related queries on mutations
- Support pagination and filtering
- Enable complex JOIN operations
*/
