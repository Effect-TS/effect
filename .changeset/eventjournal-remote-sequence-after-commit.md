---
"effect": patch
---

Fix the memory and IndexedDB `EventJournal` advancing a remote's sequence past a failed batch's new entries when the batch also contained duplicates, and the memory journal missing newer conflicts after a local write follows a future-dated import.
