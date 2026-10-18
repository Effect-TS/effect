---
"effect": patch
---

Acknowledge event log writes instead of echoing them to the writing connection. Breaking protocol change: upgrade clients and servers together; mixed versions are unsupported.

Custom implementations must add `EventJournal.writeRemoteAcks`, add encrypted `Storage.entrySequences` (the sequence each entry was first stored at, used to acknowledge skipped batches), and return `RemoteEntry` values from unencrypted `Storage.entriesAfter`. Set `firstSequence` when sequences start above 0. Custom remotes can still return `void` from `write` to confirm uploads through the change stream.

`SqlEventLogServerEncrypted` adds a sequence column to its entry id tables, so encrypted servers still need fresh storage.
