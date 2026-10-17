---
"effect": patch
---

Fix encrypted SQL event-log storage to publish and return only newly inserted entries when clients re-upload a batch. Existing sequence assignments and the changes backlog are preserved.
