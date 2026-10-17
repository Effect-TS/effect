---
"effect": minor
---

Acknowledge event log writes without echoing them to the writing connection, while preserving peer delivery and safe reconnect cursors. This is a breaking protocol change: upgrade clients and servers together; mixed old and new versions are not supported.

- Custom journals must implement `EventJournal.writeRemoteAcks`. Custom remotes may still return `void` from `write` to confirm uploads through the change stream.
- Custom encrypted storage must return every written entry from `Storage.write`, including duplicates; unencrypted `Storage.entriesAfter` must return `RemoteEntry` values. Set `firstSequence` if sequences start above 0.
- SQL journals create a download cursor table (`remoteCursorsTable`, default `<remotesTable>_cursors`) and retain the legacy cursor fallback for existing databases.
