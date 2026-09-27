---
"effect": patch
---

Fix stdio MCP servers rejecting pings before initialization when a stateful protocol is configured, including when a stateless protocol is listed first. These pings now return an empty result without creating a session.
