---
"effect": patch
---

Fix encrypted SQL event-log storage to return and publish only newly inserted entries, avoiding duplicate broadcasts when clients re-upload a batch.
