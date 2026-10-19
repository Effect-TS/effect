---
"effect": patch
---

Add the `ClusterMetrics.entityMailboxMax` gauge (`effect_cluster_entity_mailbox_max`) tracking the largest in-flight request count of a single entity per entity type, so mailbox saturation can be alerted on before requests fail with `MailboxFull`.
