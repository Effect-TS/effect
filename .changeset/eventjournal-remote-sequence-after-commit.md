---
"effect": patch
---

Fix the memory and IndexedDB `EventJournal` advancing a remote's sequence for a batch whose callback failed, and the memory journal missing conflicts while a clock-skewed local write leaves it unordered.
