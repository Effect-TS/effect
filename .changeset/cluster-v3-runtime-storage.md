---
"@effect/cluster": minor
"@effect/workflow": minor
"@effect/rpc": patch
---

Fix cluster shutdown, routing, registration, persisted stream decoding, shard-lock recovery, and resource cleanup. Fix workflow replay after runner restart, deferred races, self-completion deadlocks, finalization ordering, and zero-duration clocks. Interrupted RPC stream writes now release waiting consumers.

Malformed persisted replies now release waiters and notify callers with the stored terminal defect. `MessageStorage.saveReply` returns `ReplyWithContext<R>` instead of `void`, preserving v3's support for wrapping a service with `MessageStorage.make`. Custom implementations must return the actual persisted reply; use `Effect.asVoid` where a void result is required. Encoded storage drivers are unchanged.

Deferred completions wait for suspension replies before resuming discarded workflows. Unrelated completions do not occupy that wait, leaving mailbox capacity for the required completion. The v3 `DeferredState` API retains `pendingResult` and the `exit` argument to `deferredDone`; these differ from v4.

Persisted requests abandoned during teardown interrupt active workflow/activity owners for replay, including when abandonment is relayed from detached children. Volatile requests and acknowledgements can fail with `EntityNotAssignedToRunner`. Persisted `Sharding.sendOutgoing(request, false)` calls stop at abandonment even in uninterruptible regions. Workflow proxy discard calls return execution IDs. Suspended activities run again on replay, so side effects before suspension must be idempotent.

Entity clients using `asMailbox: true` forward replies through a request-scoped pump with the requested consumer capacity (default 16), one RPC buffer element and one forwarding element. A producer chunk may also be in flight. Element-wise forwarding adds per-element work and can change chunk boundaries. Closing the request scope cancels blocked forwarding.

Abandonment may wait behind buffered values. Unary, stream and mailbox relays interrupt an active workflow/activity owner without separately re-interrupting the relaying fiber. Callers outside an active owner window receive a recoverable cause and may continue, including performing durable writes after recovery. The abandoned run still cannot persist a completed result. The mailbox pump signals the owner before forwarding the cause.

**Deployment:** Stop all runners before upgrading. PostgreSQL advisory locks now include storage prefixes; mixing protocols can give multiple runners the same shard. Runner notifications also change, so upgrade all peers together.
