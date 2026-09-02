---
"@effect/sql-mssql": patch
---

Fix automatic VarBinary binding for Uint8Array and Int8Array SQL parameters, preserving signed bytes, subarray bounds, and empty values. Custom parameter types and explicit parameters retain their existing behavior.
