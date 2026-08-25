---
"effect": patch
---

Add `SqlConnection.Borrower` and an optional `borrower` to `SqlClient.MakeOptions`.

A client that can lend a connection for the duration of one effect, rather than
leasing one into a scope, now says so, and a statement that finishes with the
effect that runs it takes that path. `stream`, transactions, and `reserve` keep
the acquirer, whose lease has to outlive the effect that starts it, and a driver
that provides no borrower is unchanged.
