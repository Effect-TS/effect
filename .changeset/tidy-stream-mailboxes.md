---
"@effect/rpc": patch
"@effect/cluster": patch
---

Forward interrupted RPC stream writes to their mailboxes during guaranteed cleanup, releasing parked consumers while preserving the write fiber's failure cause. This generic RPC cleanup is a v3 fix, not a direct upstream backport.

Re-signal relayed cluster abandonment for all entity callers, including callers outside workflows. Unary callers and mailbox readers retain genuine interruption and their existing masks, so `catchAllCause` or `exit` cannot swallow abandonment in those fibers. Streams use the same mailbox read handling.

The attempt-owner mechanism is a v3-specific adaptation: stream channel reads run in a child fiber whose exit is relayed through a deferred, so marked abandonment also interrupts the active workflow or activity owner. This prevents recovery from persisting an incorrect durable Complete. It is stronger than upstream behavior because an active owner's detached children can also interrupt it through marked abandonment. Inherited owner references become inert after execution ends.
