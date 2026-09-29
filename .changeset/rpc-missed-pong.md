---
"effect": patch
---

Fail in-flight RPC calls when a socket misses a pong, even with transient connection retries enabled. Missed pongs no longer invoke `onTransientError`; connection-open failures still do.
