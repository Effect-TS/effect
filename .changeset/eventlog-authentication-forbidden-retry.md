---
"effect": patch
---

Fix `EventLogRemote` writes and change-stream startup failing immediately when authentication returns `Forbidden`. These operations now re-authenticate within the existing retry limit, allowing a second identity on the same connection to recover from an expired authentication challenge. Persistent `Forbidden` responses still fail after six total attempts; permissions and other error handling are unchanged.
