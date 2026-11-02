---
"effect": minor
---

Add `ClusterSchema.Retention` so completed requests of annotated cluster entities are deleted from message storage after the retention, checked every `ShardingConfig.messageRetentionInterval`.

- Custom `MessageStorage` implementations must add `deleteProcessed`, which deletes an entity type's requests in the given shards completed before a cutoff along with their replies.
- Code that builds a full `ShardingConfig` service without `ShardingConfig.layer` or `defaults` must add `messageRetentionInterval`.
