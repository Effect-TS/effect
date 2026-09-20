---
"effect": patch
---

Preserve `writeFromRemote` callback and compact error identity in `SqlEventJournal`, the same way `write` and `withRemoteUncommited` already do. The public error channel is now `EventJournalError | E`.
