---
"effect": minor
---

Add `SqlClient.clientBatch` and the optional `Connection.executeBatch` hook, which let SQL drivers expose a batch API that runs with the client's statement transforms, tracing and transaction routing.
