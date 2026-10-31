---
"effect": patch
---

Keep `EventLogServer` session auth challenges on their RPC connection, so a challenge is released when its client disconnects instead of being retained by the server after an unauthenticated disconnect.
