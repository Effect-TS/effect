---
"effect": patch
---

Checkpoint `SqlEventJournal` uploads per remote and add secondary indexes.

Uploads no longer resend entries the remote has not echoed back. Entries are numbered in insertion order and each remote records the last sequence it was sent, so entries imported later with older ids are still forwarded. Conflict lookups, entry reads and remote sequence lookups now use indexes.

Existing databases are migrated the first time they are opened, which needs a writable connection. The first upload after the upgrade may resend entries the remote has not confirmed.

`write` and `writeMany` now run their callback inside the journal transaction and, on PostgreSQL, take the writer lock before it. Without an outer transaction, a failed or interrupted write also rolls back the SQL its callback ran on the same client.
