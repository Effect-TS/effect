---
"effect": patch
---

Acknowledge event log writes and stop echoing them back to the writer. This is a breaking protocol change: upgrade event log clients and servers together, because mixed versions are not supported.

- `EventLog.WriteSingle` and `EventLog.WriteChunked` now return the sequence assigned to each written entry, including entries the server already held. `HelloResponse` reports the server's first sequence.
- Servers no longer send a connection the entries it wrote. Other connections, including other devices with the same identity, still receive them.
- `EventLogRemote.write` returns the acknowledgements, and `EventLog` records them with the new `EventJournal.writeRemoteAcks`. The download sequence only moves past an acknowledged entry when every earlier sequence is known, so reconnects still fetch entries written by other replicas.
- `SqlEventJournal` adds a remote cursors table (`remoteCursorsTable`, default `effect_event_remotes_cursors`). Existing databases are read as before until the table is written.
- Custom server storages must follow the updated contracts: encrypted `Storage.write` returns an entry for every written entry, unencrypted `Storage.entriesAfter` returns `RemoteEntry` values, and both may set `firstSequence`.
