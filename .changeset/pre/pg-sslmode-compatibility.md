---
"@effect/sql-pg": patch
---

Support `sslmode=prefer` and `sslmode=allow` by trying TLS first, then plaintext if the server declines `SSLRequest`. Unlike libpq, `allow` also tries TLS first. Explicit `ssl` overrides and certificate verification are unchanged. TLS handshake and certificate failures remain fatal. Cancellation never downgrades a TLS session to plaintext.
