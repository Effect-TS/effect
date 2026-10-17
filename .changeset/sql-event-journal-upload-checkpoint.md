---
"effect": patch
---

Improve `SqlEventJournal` uploads and query performance.

- Checkpoint successful uploads per remote without waiting for an echo, while forwarding older entries imported later.
- Index conflict, entry-ordering and remote-sequence queries.
- Migrate existing databases on first open using a writable connection. The first upload after migration may resend unconfirmed entries.
- Run `write` and `writeMany` callbacks in the journal transaction, rolling back their SQL on the same client if the write fails or is interrupted.
