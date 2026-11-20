---
"effect": patch
---

Fix `HttpRouter` so an explicit route takes precedence over a wildcard at its bare prefix, regardless of registration order.
