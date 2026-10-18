---
"effect": patch
---

Skip decrypting remote changes the local event journal already stores, and pass entry bytes to WebCrypto without copying them. `EventJournal` gains a required `entriesById` method, which custom journal implementations must add.
