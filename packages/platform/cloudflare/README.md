# @effect/platform-cloudflare

Runs Effect Cluster on [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/). Every entity instance is one Durable Object, the Worker is the edge, and each object's SQLite storage is the system of record.

## Installation

```sh
npm install effect@rc @effect/platform-cloudflare@rc
```

## Usage

The package ships four Durable Object classes. Re-export them from your Worker entry module and bind each one as a SQLite-backed class:

```jsonc
// wrangler.jsonc
{
  "name": "my-worker",
  "main": "src/worker.ts",
  "compatibility_date": "2026-08-01",
  "durable_objects": {
    "bindings": [
      { "name": "CLUSTER_ENTITY", "class_name": "ClusterEntity" },
      { "name": "CLUSTER_WORKFLOW", "class_name": "ClusterWorkflow" },
      { "name": "CLUSTER_QUEUE", "class_name": "ClusterDurableQueue" },
      { "name": "CLUSTER_SINGLETON", "class_name": "ClusterSingleton" },
    ],
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": [
        "ClusterEntity",
        "ClusterWorkflow",
        "ClusterDurableQueue",
        "ClusterSingleton",
      ],
    },
  ],
  "triggers": {
    "crons": ["0 * * * *"],
  },
}
```

```ts
// src/worker.ts
import { CloudflareCluster } from "@effect/platform-cloudflare"
import { Effect, Layer, Schema } from "effect"
import { Entity, Singleton } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"

export {
  ClusterDurableQueue,
  ClusterEntity,
  ClusterSingleton,
  ClusterWorkflow
} from "@effect/platform-cloudflare/CloudflareDurableObjects"

// The same Entity + RpcGroup definitions as on every other cluster path
const Counter = Entity.make("Counter", [
  Rpc.make("Increment", { success: Schema.Number })
])

const CounterLayer = Counter.toLayer({
  Increment: () => Effect.succeed(1)
})

const MaintenanceLayer = Singleton.make(
  "hourly-maintenance",
  Effect.logInfo("Running hourly maintenance")
)

const clusterLayer = (env: Env) =>
  Layer.merge(CounterLayer, MaintenanceLayer).pipe(
    Layer.provideMerge(CloudflareCluster.layer({
      entities: [Counter],
      entityNamespace: env.CLUSTER_ENTITY,
      workflowNamespace: env.CLUSTER_WORKFLOW,
      queueNamespace: env.CLUSTER_QUEUE,
      singletonNamespace: env.CLUSTER_SINGLETON
    }))
  )
```

The Cron Trigger wakes the named singleton through its same-Worker binding.
The call returns after one run, allowing the Durable Object to hibernate; do
not make the singleton effect a forever loop.

```ts
export default {
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const singleton = env.CLUSTER_SINGLETON.getByName("Singleton/hourly-maintenance")
    ctx.waitUntil(singleton.wake())
  }
}
```

`Entity.client` stays the user API. The Worker encodes `(type, id)` into the Durable Object name and resolves the object with `getByName`; an unknown entity type fails at the Worker before any Durable Object is contacted.

## Worker routes

The existing `EntityProxy` / `EntityProxyServer` and `WorkflowProxy` /
`WorkflowProxyServer` modules remain the route helpers. Define an HTTP or RPC
surface with the proxy module, then provide its server layer with
`CloudflareCluster.layer`. Entity proxy handlers call `Entity.client`, and
workflow proxy handlers call the workflow API, so the Cloudflare layers encode
the entity or workflow name and resolve the corresponding Durable Object stub.
There is no runner-fleet proxy on this path.

These are Worker routes, not Durable Object routes. The Durable Object classes
are internal transport: they trust the same-Worker namespace bindings and must
not be exposed on a public route. HTTP or RPC authentication and authorization
are user code on the Worker.

## Long waits and delivery

- A long ask pins the caller. A delayed ask made directly by a Worker also
  keeps the destination RPC open, so it pins the destination too.
- Caller eviction or deployment drops the in-memory wait even though the
  destination may still run the persisted request.
- Prefer a tell when no response is needed. For durable long waits, prefer a
  workflow with `DurableClock` and `DurableDeferred`.
- Stream asks with a future `DeliverAt` are outside v1.

## Handler concurrency

`Entity.toLayer(..., { concurrency })` applies inside the entity Durable
Object. The default of 1 runs one handler at a time, a number allows that many
in-flight handlers per entity, and `"unbounded"` removes the limit. Durable
Object isolates are single-threaded, so this is interleaving of suspended
handlers, not parallelism.

- Envelope decode, persist-before-run, dedupe, duplicate resume, and alarm
  arming stay serialized at any setting.
- With `concurrency` above 1, strict mailbox ordering holds per permit, the
  same as the classic runner path: in-flight handlers interleave at every
  suspension point.
- An ask cycle (entity A asks B while B's handler asks A back) needs
  `concurrency` of at least 2 on the entity receiving the second ask. At the
  default of 1 the cycle deadlocks, matching the classic contract.
- Replayed mailbox rows and alarm-due runs draw from the same budget as live
  requests.

## v1 compatibility

The status vocabulary is **maps 1:1**, **adapted**, and **out of scope**.

| Capability                                                                    | Status       | Rationale                                                                                                   |
| ----------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `Entity` + `RpcGroup` definition                                              | adapted      | Same definition; handlers register at Worker init onto one shared Durable Object class                      |
| `Entity.client` / location-transparent ask-tell                               | adapted      | Worker encodes `(type, id)` and calls `getByName`; there is no `ShardId` routing                            |
| `EntityProxy` / `EntityProxyServer` and workflow equivalents                  | adapted      | Worker route helpers encode the name and stub the Durable Object through the Cloudflare layers              |
| Non-`Persisted` RPC                                                           | adapted      | Best-effort in-request only; it can be lost on hibernation or a crash                                       |
| `Persisted` ask/tell + mailbox                                                | adapted      | Per-entity Durable Object SQLite, persist-before-run, and uuidv7 request ids                                |
| `PrimaryKey` dedupe / `Duplicate` resume                                      | maps 1:1     | Same contract                                                                                               |
| Stream ask `Chunk` / `AckChunk` / `lastSentChunk` / `WithExit`                | maps 1:1     | Same reply protocol on Durable Object storage                                                               |
| `clearReplies` / `reset`                                                      | maps 1:1     | Same re-run semantics                                                                                       |
| `DeliverAt` mailbox delivery                                                  | adapted      | Destination due column and alarm instead of storage polling                                                 |
| Ask + future `DeliverAt`                                                      | adapted      | Destination may hibernate through `replyTo`; ask pins its caller, and a Worker ask pins the destination too |
| `MailboxFull` / 4096 cap / 2 MB row rejection                                 | maps 1:1     | Same limits; the SQLite row is the hard ceiling                                                             |
| `defectRetryPolicy` then terminal defect                                      | adapted      | Rebuilds handlers in the wake; crash or deployment wipes memory and replays unprocessed rows                |
| `Entity.toLayer` `concurrency`                                                | maps 1:1     | Same per-entity handler interleaving contract; storage entry stays serialized at any setting                |
| `Entity.keepAlive`                                                            | adapted      | Pins while holders exist; hibernation is allowed with no holders                                            |
| `CurrentRunnerAddress`                                                        | adapted      | Synthetic address for identity and telemetry; no peer dialing                                               |
| `EntityResource.make`                                                         | adapted      | External lifetimes such as a browser; close or idle TTL unpins                                              |
| `EntityResource.makeK8sPod`                                                   | out of scope | Requires `K8sHttpClient`                                                                                    |
| `Workflow` / `Activity` / `DurableDeferred` user APIs                         | maps 1:1     | Unchanged; the engine behind them changes                                                                   |
| `CloudflareWorkflowEngine` (`WorkflowEngine.Encoded`)                         | adapted      | Dedicated workflow Durable Object, SQLite, and one alarm                                                    |
| `DurableClock`                                                                | adapted      | Always durable; there is no short in-memory timer path                                                      |
| `DurableQueue`                                                                | adapted      | One Durable Object per queue name with SQLite and an alarm watchdog                                         |
| `Singleton`                                                                   | adapted      | Named Durable Object; runs once per wake and then may hibernate                                             |
| `ClusterCron`                                                                 | adapted      | Per-fire entity ids, `DeliverAt` destination alarms, and a singleton seed                                   |
| Address `(EntityType, EntityId)`                                              | adapted      | Length-prefixed Durable Object name; cold first contact is normal                                           |
| `ShardId` / shard locks / runner ring                                         | out of scope | One-instance-per-id replaces ownership                                                                      |
| `MessageStorage` / `RunnerStorage` / `RunnerHealth` / `Runners` as user seams | out of scope | The Durable Object path owns persistence and alarms internally                                              |
| `HttpRunner` / `SocketRunner` / peer runner fleet                             | out of scope | Worker edge only                                                                                            |
| `EntityReaper` / `maxIdleTime`                                                | out of scope | Cloudflare hibernation owns sleep; `keepAlive` holders provide pinning                                      |
| Activate/deactivate / shard handoff / `EntityNotAssignedToRunner`             | out of scope | Whole-wake handlers with no handoff                                                                         |
| Park-and-replay caller hibernation                                            | out of scope | Not part of v1                                                                                              |
| Stream ask + future `DeliverAt`                                               | out of scope | Delayed asks support non-stream `WithExit` only                                                             |
| External SQL as the system of record                                          | out of scope | Durable Object SQLite is the system of record                                                               |
| Non-Worker long-lived runners as a first-class edge                           | out of scope | The Worker is the supported edge model                                                                      |

## Documentation

- [Effect website](https://effect.website)
