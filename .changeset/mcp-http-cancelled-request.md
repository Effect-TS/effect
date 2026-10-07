---
"effect": patch
---

Return empty 200 text/event-stream responses for MCP HTTP request POSTs when cancellation withholds every reply. Return 500 for other request POSTs that end without a response.
