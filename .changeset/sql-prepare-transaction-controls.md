---
"effect": patch
---

Add `prepareTransactionControls` to `SqlClient.MakeOptions`.

`BEGIN`, `COMMIT`, `ROLLBACK` and the savepoint pair run on every transaction
and never change, but they were always sent unprepared. A driver whose database
can prepare transaction control now says so and stops paying to parse them
again each time. Off by default, since several databases refuse to prepare
transaction control at all.
