# Backend API: User Sync (descope_user_id)

**Rule:** Always sync users using `descope_user_id`, never email.

## Endpoint

```
POST /auth/sync-user
Authorization: Bearer <Descope session JWT>
Content-Type: application/json
```

## Request Body

```json
{
  "descope_user_id": "D0xxxxxxxxxxxx",  // Required. Descope userId - NEVER use email as primary
  "email": "user@example.com",           // Required for create. Optional for lookup.
  "username": "optional"                  // Optional. Display name.
}
```

## Logic (Get or Create)

1. **Lookup** by `descope_user_id` only (never by email).
2. **If user exists** → Return user.
3. **If user does not exist** → Create with `descope_user_id`, `email`, `username` → Return created user.

## Response (200 OK)

```json
{
  "data": {
    "id": "db-uuid-or-account-id",
    "descope_user_id": "D0xxxxxxxxxxxx",
    "email": "user@example.com",
    "username": "optional",
    "account_id": "...",
    "account_number": "..."
  }
}
```

Or backend may return user at top level:

```json
{
  "user": {
    "id": "...",
    "descope_user_id": "...",
    "email": "...",
    "username": "..."
  }
}
```

## Database Schema

Users table must have:

- `descope_user_id` (unique, indexed) - Primary lookup key.
- `email` - Can change; do not use for lookup.
- `username`, etc.

**Never** query users by email alone. Always use `descope_user_id`.

## Protected Endpoints (Profile, etc.)

Endpoints that require auth (e.g. `/profile/complete`, `/profile`, `/profile/summary`):

1. Validate `Authorization: Bearer <JWT>`.
2. Extract `sub` from JWT (= Descope userId = descope_user_id).
3. Look up user by `descope_user_id` (= `sub`).
4. Return user data.

**Never** look up by email from JWT or request body.

## Edge Cases

| Case | Action |
|------|--------|
| User in Descope, not in DB | Create via sync-user |
| User in DB, not in Descope | Handle gracefully (e.g. require re-auth) |
| Email changes | No impact; linkage is descope_user_id |
| Duplicate descope_user_id | Reject or return existing |
