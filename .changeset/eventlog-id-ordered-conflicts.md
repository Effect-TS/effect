---
"effect": patch
---

Order EventLog conflicts by entry id in every journal and the unencrypted server, so replicas converge. A conflict is now a stored entry for the same event and primary key with a strictly greater id, remote batches replay in id order after compaction, and compaction replacements are ordered and conflict-checked by the source entry they are anchored to.
