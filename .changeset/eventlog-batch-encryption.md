---
"effect": patch
---

Encrypted event log replication now encrypts entries in batches of up to 100 entries or about 256 KB of payload, one AES-GCM call per batch, and encrypted servers store and stream those batches. Each batch authenticates its store id and plaintext entry ids. This changes the encrypted protocol, APIs and server tables without migration: upgrade encrypted clients and servers together, and start encrypted servers on fresh storage because existing per-entry rows are not read.

### Breaking changes

- `EncryptedEntry` and `EncryptedRemoteEntry` are replaced by `EncryptedBatch` and `EncryptedRemoteBatch`, and `WriteEntries.encryptedEntries` becomes `batches`.
- `EventLogEncryption.encrypt` and `decrypt` take the store id and work on batches, and the `decodeChanges` option of `EventLogRemote.makeWith` receives the store id.
- `EventLogServerEncrypted.Storage.write` and `changes` use batches, `PersistedEntry` is removed, and `SqlEventLogServerEncrypted` no longer accepts `insertBatchSize`.

Event journals now keep the first copy of an entry that is repeated within one remote delivery, and `SqlEventJournal` advances an entry's remote sequence when it arrives again later, so `nextRemoteSequence` passes it.
