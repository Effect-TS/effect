---
"effect": patch
---

Fix a race where a deferred fiber could lose an interruption delivered before its first slice if interrupt evaluation yielded.
