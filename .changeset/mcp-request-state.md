---
"effect": minor
---

Protect `McpServer` continuation state with configurable expiry, shared keys, and authenticated principal binding.

Previously issued raw state strings are rejected; clients must restart those operations and echo new tokens unchanged. Handlers keep using their original state strings. Configure `requestState.keys` for retries across instances or server restarts, and provide `RequestStatePrincipal` from authentication middleware when serving authenticated users.
