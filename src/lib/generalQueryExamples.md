# General Query Engine Usage Examples

This general query engine allows you to perform SQL operations on any table through URL parameters without being bound to specific tables or columns.

## URL Parameter Structure

### Required Parameters

- `table`: The table name to query
- `operation`: The SQL operation (`select`, `insert`, `update`, `delete`)

### Optional Parameters for SELECT

- `columns`: Comma-separated list of columns to select (defaults to `*`)
- `where_[column]`: Filter conditions (e.g., `where_id=123`)
- `orderBy`: Column to order by
- `orderDirection`: `ASC` or `DESC` (defaults to `ASC`)
- `limit`: Maximum number of records to return
- `offset`: Number of records to skip

### Parameters for INSERT

- `data_[column]`: Data to insert (e.g., `data_name=John&data_email=john@example.com`)

### Parameters for UPDATE

- `data_[column]`: Data to update
- `where_[column]`: WHERE conditions (required for safety)

### Parameters for DELETE

- `where_[column]`: WHERE conditions (required for safety)

### Join Parameters

- `join_[index]_table`: Table to join
- `join_[index]_type`: Join type (`INNER`, `LEFT`, `RIGHT`, `FULL`)
- `join_[index]_on`: Join condition

## Usage Examples

### 1. Select All Products

```
/api/query?table=products&operation=select
```

### 2. Select Specific Columns with Filter

```
/api/query?table=users&operation=select&columns=id,name,email&where_status=active&orderBy=created_at&orderDirection=DESC&limit=10
```

### 3. Select with Join

```
/api/query?table=orders&operation=select&columns=orders.id,orders.total,users.name&join_0_table=users&join_0_type=INNER&join_0_on=orders.user_id=users.id&where_orders.status=completed
```

### 4. Insert New Record

```
/api/query?table=products&operation=insert&data_name=New Product&data_price=29.99&data_category=1&data_status=active
```

### 5. Update Record

```
/api/query?table=users&operation=update&data_email=newemail@example.com&data_updated_at=2025-06-18&where_id=123
```

### 6. Delete Record

```
/api/query?table=products&operation=delete&where_id=456&where_status=inactive
```

### 7. Complex Select with Multiple Conditions

```
/api/query?table=orders&operation=select&where_status=pending&where_created_at>2025-01-01&where_total>100&orderBy=created_at&limit=50&offset=0
```

## Response Format

The query engine returns a consistent response format:

```json
{
  "success": true,
  "data": [...], // Query results
  "operation": "select",
  "table": "products"
}
```

For errors:

```json
{
  "success": false,
  "error": "Error message",
  "operation": null,
  "table": null
}
```

## Security Features

1. **Parameterized Queries**: All values are properly escaped to prevent SQL injection
2. **Required WHERE Clauses**: UPDATE and DELETE operations require WHERE conditions
3. **Input Validation**: Operation and table parameters are validated
4. **Error Handling**: Comprehensive error messages for debugging

## Example Integration

```typescript
import generalQuery from "./lib/generalQuery";

// In your API endpoint
const handleApiRequest = async (request: Request) => {
  const url = new URL(request.url);
  const result = await generalQuery(url);

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};
```

## Advanced Usage

### Dynamic Column Selection

```
/api/query?table=products&operation=select&columns=id,name,price,category.name&join_0_table=categories&join_0_type=LEFT&join_0_on=products.category=categories.id
```

### Pagination

```
/api/query?table=users&operation=select&limit=20&offset=40&orderBy=id
```

### Batch Operations

For multiple operations, call the query engine multiple times or extend it to support batch processing.

This general query engine provides a flexible, secure, and easy-to-use interface for database operations without being tied to specific schemas or tables.
