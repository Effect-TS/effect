# Proposal: result retention for Effect Workflows on Durable Objects

The Effect Workflow engine backed by Cloudflare Durable Objects currently retains
completed executions and their journals. This is Effect's DO engine, not the
Cloudflare Workflows product. This draft proposes opt-in collection without losing retry safety or
the results that callers still need for replay. It does not implement GC or add
a public API.

## The problem in one example

An Activity provisions a server. Retrying the same execution returns the stored
result while the execution is retained:

```ts
const first = yield * Provision.execute({ requestId: "create-1" })
const retry = yield * Provision.execute({ requestId: "create-1" })
// One server is created; both calls return its ID.
```

`Provision` represents a registered Workflow whose idempotency key is `requestId`.
If a cleanup job removes all of that execution's storage, the same call can
create another server. Removing only the Activity cache is also unsafe while a
caller can replay an unfinished Workflow. A result TTL therefore needs an
explicit duplicate-start policy, not just SQL DELETE statements.

The included executable probes use the existing Workflow runtime fixture:

| Probe                                                                                                        | Current observation                                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Remove a completed execution's store, restart, and retry the same payload                                    | The Activity executes a second time                        |
| Deliver a child's completion wake, suspend its parent on another Deferred, remove child storage, and restart | Parent replay executes the child Activity again            |
| Send a new Deferred completion to an already completed execution                                             | A Deferred row is stored and a resume guard alarm is armed |

The first two probes deliberately simulate an unsafe cleanup operation. They do
not claim that the engine currently deletes data or exposes a cleanup method.
The third observes existing late-delivery behavior. None is a physical-storage,
Cloudflare billing, or automatic-retention measurement.

Run the probes from the repository root:

```sh
bun --bun vitest run --project @effect/platform-cloudflare \
  packages/platform/cloudflare/test/CloudflareWorkflowEngine.test.ts \
  -t 'retention characterization'
```

These are passing characterizations of the current engine, not a completed
retention implementation or regression tests proving safe collection. They
should be replaced or adapted once the intended retention contract is agreed.

## Proposed behavior

Keep today's behavior by default. For opted-in executions:

1. Persist the policy with the execution. Count result retention from terminal
   completion, including required cleanup, rather than from the request date.
2. Collect only terminal executions. Preserve suspended/running work and
   outstanding parent notification. Notification delivery alone is insufficient:
   an awaiting parent must durably retain the child's result, or have another
   durable way to observe expiry without silently rerunning the child.
3. Coordinate collection through the existing alarm. Remove replay data
   transactionally and preserve the duplicate-start decision after its removal.
   Ignore late deliveries that could recreate collected data.

No separate scheduler or new table is inherently required. Adding metadata to
the existing execution row and using the parent's Activity store are candidate
implementation choices, not a settled storage design.

## Decisions before implementation

- **Where is policy defined?** A Core annotation could make result retention
  portable. An adapter-local option avoids silently promising retention on
  engines without support. A shared annotation needs explicit unsupported-engine
  behavior; declaring it in Core alone cannot implement collection.
- **What happens after expiry?** Choose the result of `poll` and an identical
  `execute`, the duration of duplicate rejection, and whether IDs can ever be
  reused. A permanent tombstone avoids accidental re-execution but leaves a
  storage record. Bounded tombstones require a separate trustworthy admission
  boundary. An arbitrary caller-supplied deadline is not enough.
- **Who still owns the result?** Native parents, persisted Entity handlers, and
  external clients have different replay needs. Parent wake acknowledgement is
  not durable result acknowledgement. Caller loss/closure also needs a policy
  so a result does not remain pinned forever.
- **What survives changes and restores?** Persist admitted policy; do not infer
  completion times for old rows. Define behavior when an old caller is restored
  after its child's result has expired. This proposal does not provide coordinated
  multi-object restore or Workflow-code version pinning.

Request expiry and execution-ID derivation should stay separate from the first
result-retention API. Entry byte limits are another independent constraint:
they do not bound the total journal of a long-running execution or provide
ContinueAsNew/history compaction.

Deleting SQL rows also does not establish physical SQLite reclamation, deletion
of the Durable Object itself, or reduced storage billing. Those require separate
Cloudflare-specific verification.

## Suggested implementation sequence

Agree on the result/duplicate/caller contract first, then add the smallest Core
policy if it is shared across engines. Implement the DO adapter with focused
tests for terminal cleanup, pending parent delivery, caller replay after child
collection, duplicate starts, late Deferred/clock delivery, migration, and
restart during collection. A Core annotation or an isolated TTL DELETE would
not complete that behavior.
