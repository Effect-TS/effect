---
"effect": patch
---

Fix RPC and MCP stdio servers exiting with code 130 instead of 0 after stdin closes and pending responses drain.
