---
"effect": patch
---

Order EventLog conflicts by entry id in every journal and the unencrypted server, so replicas converge. A conflict is now a stored entry for the same event and primary key with a strictly greater id, remote batches replay in id order after compaction, and compaction replacement ids are derived from their source entry instead of being random.
