---
"effect": patch
---

Encrypt event log entries in batches of up to 100 entries (about 256 KB) with one AES-GCM call per batch. This is a breaking protocol and storage change: upgrade encrypted clients and servers together, and start encrypted servers on fresh storage, because existing per-entry rows are not read.

- `EncryptedEntry` and `EncryptedRemoteEntry` are replaced by `EncryptedBatch` and `EncryptedRemoteBatch`. `WriteEntries` carries `batches`, and encrypted `Changes` frames carry batches.
- Each batch authenticates its plaintext entry ids and the store id, so a server can no longer alter the ids or move entries between stores of the same identity.
- `EventLogEncryption.encrypt` and `decrypt` take the store id and work on batches.
- `EventLogServerEncrypted.Storage` stores batches. A batch whose entry ids are all already stored is skipped, so retried writes allocate no sequences. `PersistedEntry` is removed.
- `SqlEventLogServerEncrypted` uses a batch table and an entry id table per scope.
