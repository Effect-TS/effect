---
"effect": patch
---

Route MCP log and progress notifications to their originating request, including stateless stdio requests. Unrelated HTTP requests and subscription streams no longer receive these notifications, including when clients use different protocol versions.
