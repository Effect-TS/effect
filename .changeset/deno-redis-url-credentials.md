---
"@effect/platform-deno": patch
---

Decode percent-encoded Redis URL usernames and passwords once so they authenticate as the same credentials supplied through explicit connection options. Explicit options still take precedence, and query-string passwords retain their existing decoding behavior.
