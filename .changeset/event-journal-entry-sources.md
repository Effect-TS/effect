---
"effect": patch
---

Track the source remote of each imported entry in `SqlEventJournal` and the IndexedDB `EventJournal`, instead of one row per entry per remote.

- Storage now grows with entries rather than entries times remotes. An imported entry is still relayed to other remotes and never uploaded back to its source.
- Existing databases migrate on first open: SQL drops the remotes table, and IndexedDB upgrades to version 4. SQL needs a writable connection.
- An entry acknowledged by a remote, or known to several remotes before migrating, may be uploaded to a remote once more. The server treats it as a duplicate.
