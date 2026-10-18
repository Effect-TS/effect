---
"effect": patch
---

Acknowledge event log writes instead of echoing them to the writing connection. Breaking protocol change: upgrade clients and servers together; mixed versions are unsupported.

Custom implementations must add `EventJournal.writeRemoteAcks`, return all written entries (including duplicates) from encrypted `Storage.write`, and return `RemoteEntry` values from unencrypted `Storage.entriesAfter`. Set `firstSequence` when sequences start above 0. Custom remotes can still return `void` from `write` to confirm uploads through the change stream.
