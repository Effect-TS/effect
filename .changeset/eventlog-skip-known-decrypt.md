---
"effect": patch
---

Skip decrypting remote changes that the local event journal already has, pass entry bytes to WebCrypto without copying them, and speed up UUID stringification. `EventJournal` gains an `entriesById` method, which custom journal implementations need to provide.
