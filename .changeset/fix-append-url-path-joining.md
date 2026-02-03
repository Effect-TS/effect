---
"@effect/platform": patch
---

Fix `HttpClientRequest.appendUrl` to properly join URL paths.

Previously, `appendUrl` used simple string concatenation which could produce invalid URLs:
```typescript
// Before (broken):
appendUrl("https://api.example.com/v1", "users")
// Result: "https://api.example.com/v1users" (missing slash!)
```

Now it ensures proper path joining:
```typescript
// After (fixed):
appendUrl("https://api.example.com/v1", "users")
// Result: "https://api.example.com/v1/users"
```
