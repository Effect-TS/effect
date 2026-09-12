---
"@effect/sql-pg": patch
---

Restore raw PostgreSQL `options` support from explicit configuration and connection URLs. Forward options unchanged on each physical connection to establish session defaults without additional SQL queries. Reject NUL bytes before connecting and preserve the driver's UTF-8 encoding. Document session defaults and configuration precedence; `PGOPTIONS` is not read automatically.

Add `startupParameters` as a structured interface for session defaults without serializing or escaping settings into an `options` string. Send names and values directly in the startup packet, taking precedence over duplicate settings in options. Reject reserved direct parameters and unsupported client encodings before connecting.
