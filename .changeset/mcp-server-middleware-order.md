---
"effect": patch
---

Fix `McpServer` running a middleware provided outside a combined middleware inside it. With `TenantMiddleware.layer` provided outside `Audit.combine(Auth).layer`, `Auth` ran before `TenantMiddleware`, so a service it read from `TenantMiddleware` was missing and the request failed with an internal error.
