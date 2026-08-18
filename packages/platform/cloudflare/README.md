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
}
```

```ts
// src/worker.ts
import { CloudflareCluster } from "@effect/platform-cloudflare"
import { Effect, Layer, Schema } from "effect"
import { Entity } from "effect/unstable/cluster"
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

const clusterLayer = (env: Env) =>
  CounterLayer.pipe(
    Layer.provideMerge(CloudflareCluster.layer({
      entities: [Counter],
      entityNamespace: env.CLUSTER_ENTITY,
      workflowNamespace: env.CLUSTER_WORKFLOW,
      queueNamespace: env.CLUSTER_QUEUE,
      singletonNamespace: env.CLUSTER_SINGLETON
    }))
  )
```

`Entity.client` stays the user API. The Worker encodes `(type, id)` into the Durable Object name and resolves the object with `getByName`; an unknown entity type fails at the Worker before any Durable Object is contacted.

The Durable Object classes are internal transport: they trust the same-Worker namespace bindings and must not be exposed on a public route. HTTP or RPC authentication is user code on the Worker.

## Documentation

- [Effect website](https://effect.website)
