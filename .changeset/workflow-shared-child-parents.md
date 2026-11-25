---
"effect": patch
"@effect/platform-cloudflare": patch
---

Fix shared child workflow executions leaving additional waiting parents suspended in `ClusterWorkflowEngine`, `WorkflowEngine.layerMemory`, and `CloudflareWorkflowEngine`.

- `MessageStorage` / `MessageStorage.Encoded`: custom implementations must add `requestsForAddress({ address, tag })`, returning all saved requests (`Envelope.PartialRequestEncoded`, processed or unprocessed, across shards) matching `entityType`, `entityId`, and `tag` exactly.
- `SqlMessageStorage`: migration `0006_address_index` adds an `(entity_type, entity_id, tag)` index on the messages table.
