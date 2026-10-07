---
"effect": patch
---

Answer an MCP HTTP request POST whose responses were all withheld after `notifications/cancelled` with an empty `text/event-stream` instead of `202`, and fail any other request POST that ends without a response.
