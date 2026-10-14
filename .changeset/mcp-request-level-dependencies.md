---
"effect": minor
---

Add request-level dependencies and middleware to `McpServer` so handler services can be supplied per request. Breaking: pass registration layers through the transport's `registrations` option, and capture construction-time handler services in `Layer.unwrap` instead of `Layer.provide`.
