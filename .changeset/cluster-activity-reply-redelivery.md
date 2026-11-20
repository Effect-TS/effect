---
"effect": patch
---

Preserve completed workflow activity results when the same runner receives the request again after a transient shard-ownership check fails before its reply is saved. Keep a fenced request registered until its reply fiber exits so a concurrent storage poll can redeliver the request.
