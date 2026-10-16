---
"effect": patch
---

Answer fresh, locally owned persisted cluster requests from a reply handler registered before the request is saved, instead of reading every local reply back from storage. Duplicates and streams still read their replies from storage, and a dropped reply handler now falls back to storage immediately instead of waiting for the next poll.
