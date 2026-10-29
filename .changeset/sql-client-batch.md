---
"effect": minor
---

Add `SqlClient.batch`, which runs statements in order on one connection and returns each statement's rows as a typed tuple. Each statement is compiled and its rows transformed by the client that built it, the current `Statement.CurrentTransformer` applies to each one, and the batch runs under one client span on the enclosing transaction's connection when there is one. Drivers can implement the new optional `Connection.executeBatch` to send a batch in one round trip; otherwise the statements run one at a time with `execute`.
