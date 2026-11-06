---
"@effect/sql-pg": patch
---

Reject unregistered PostgreSQL values that contain a NUL byte instead of returning binary data as a string, name the column and type OID when an unregistered value cannot be decoded, and fail only the query that read an undecodable row instead of closing the connection.
