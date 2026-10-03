---
"@effect/sql-pglite": patch
---

Support parameterless SQL scripts in PGlite row execution, including unprepared and streaming queries. Execute scripts with PGlite's `exec` API and return the final statement's rows, while retaining parameter binding for parameterized statements.
