---
"@effect/rpc": patch
"@effect/cluster": patch
---

Forward interrupted RPC stream writes to their mailboxes during cleanup. Preserve cluster abandonment interruption on stream and mailbox consumers so recovery cannot incorrectly complete durable workflows.
