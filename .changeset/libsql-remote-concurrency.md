---
"@effect/sql-libsql": patch
---

Fix `LibsqlClient` serializing every statement and transaction on remote (`http` and `ws`) clients. Independent statements and transactions now run concurrently up to the SDK's `concurrency` limit, so concurrent write transactions contend on the server's write lock instead of queueing in the client. Local file, `:memory:` and embedded-replica clients are still serialized.
