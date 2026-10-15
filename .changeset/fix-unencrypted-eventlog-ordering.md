---
"effect": patch
---

Fix unencrypted event-log replication to acknowledge already committed entries without re-running their handlers, even when storage order differs from timestamp order or entries share a timestamp. Exclude older entries from handler conflicts regardless of storage order.
