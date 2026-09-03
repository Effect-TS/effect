---
"effect": patch
---

Preserve callback error identity in `SqlEventJournal.write` and `SqlEventJournal.withRemoteUncommited` instead of wrapping callback failures in a new `EventJournalError`. This restores typed recovery with `Effect.catchTag`, including for caller-originated `SqlError`. Journal-owned SQL and schema failures remain wrapped in `EventJournalError`.
