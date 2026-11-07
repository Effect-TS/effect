---
"effect": patch
---

`McpServer` now rejects list requests that supply a cursor, and rejects sampling requests whose tool results do not match the preceding tool uses before sending any client input request.
