---
"effect": minor
---

Add `MessageRetention.make`, a cluster singleton layer that deletes a persisted entity's completed requests and their replies from message storage once they are older than a retention.

- Custom `MessageStorage` implementations must add `deleteProcessed`, which deletes an entity type's requests completed before a cutoff along with their replies.
