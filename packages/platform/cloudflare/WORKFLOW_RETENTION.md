# Retention questions for Effect Workflows on Durable Objects

What is the intended lifecycle of completed executions in Effect's Durable
Object engine? In the reviewed Cloudflare branch, I could not find an automatic
cleanup path. This concerns Effect Workflows hosted in Durable Objects, not the
Cloudflare Workflows product.

These observations are intended to clarify the current behavior and ask about
its intended use. They do not propose a retention API or GC implementation.

## What the probes show

A Workflow's stored result currently lets repeated calls reuse its outcome:

```ts
yield * Provision.execute({ requestId: "1" }) // creates a server
yield * Provision.execute({ requestId: "1" }) // returns the same server
```

Here, `Provision` represents a registered Workflow whose idempotency key is
`requestId`. If its stored execution is manually removed and the same call is
retried, its Activity can execute again.

A parent may also replay a completed child call:

```ts
const server = yield * Provision.execute({ requestId: "1" })
yield * DurableDeferred.await(Continue)
// After a restart, this parent replays from the top.
```

The probes in `CloudflareWorkflowEngine.test.ts` observe:

- Removing a completed execution's store, restarting, and retrying repeats its
  Activity.
- Removing a child's store after its completion notification was delivered,
  then replaying its suspended parent, repeats child work.
- Sending a new Deferred completion to an already completed execution persists
  a Deferred row and arms the resume guard alarm.

The first two deliberately remove data through the test fixture. They do not
show data loss or automatic deletion by the engine. All three use the existing
in-process SQL/runtime fixture, not physical workerd or billing measurements.

Run them from the repository root:

```sh
bun --bun vitest run --project @effect/platform-cloudflare \
  packages/platform/cloudflare/test/CloudflareWorkflowEngine.test.ts \
  -t 'retention characterization'
```

## Questions

- Is there an intended cleanup mechanism or application pattern I missed?
- What should callers expect when old execution data is no longer available,
  particularly retries and parent replay?
- Is late delivery after completion intentional?

The passing probes document the reviewed behavior; they do not establish a
future retention contract. They can be adapted or removed once the intended
lifecycle is clarified. No production behavior or public API is changed.
