---
"effect": patch
---

Fix SQL-backed `MessageStorage.unprocessedMessagesById` losing the last acknowledged stream reply and returning an incorrect reply ID for chunk acknowledgement envelopes.
