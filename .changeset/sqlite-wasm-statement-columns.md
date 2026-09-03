---
"@effect/sql-sqlite-wasm": patch
---

Preserve each row-producing statement's column names in SQLite WASM worker-backed object results. Queries containing multiple statements with different names or widths no longer apply the first statement's names to later rows when both client and worker are updated. Array-valued results are unchanged.

Worker replies retain the legacy columns and flat rows, adding optional per-row column metadata only for multiple row-producing statements. Legacy two-field replies remain accepted. Mixed old/new client-worker pairs retain their previous object-result behavior; update both sides to receive corrected column names.
