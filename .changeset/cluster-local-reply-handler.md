---
"effect": patch
---

Answer fresh, locally owned persisted cluster requests from a reply handler registered before the request is saved, instead of reading every local reply back from storage. If handler registration is delayed, the request still finds its reply on the next storage poll. Duplicates and streams still read their replies from storage, and a dropped reply handler now falls back to storage immediately instead of waiting for the next poll.
