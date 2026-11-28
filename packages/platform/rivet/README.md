# @effect/platform-rivet (prototype)

Private research package: runs Effect Cluster entities on [Rivet Actors](https://rivet.dev),
following the shape of `@effect/platform-cloudflare`. Each entity instance is one
`clusterEntity` actor keyed `[entityType, entityId]`, and the mailbox lives in that
actor's own SQLite.

Supported: persisted and volatile unary asks and tells, primary-key deduplication, replay
of unprocessed requests on wake, a recurring drain schedule while requests are unprocessed,
interruption, and `ClusterSchema.WithTransaction`. Not supported: streams, `DeliverAt`,
`Entity.keepAlive`, singletons, workflows, queues and `ClusterCron`.

With `ClusterSchema.WithTransaction`, the reply commits in the handler's transaction,
including a reply the handler returns as a `Deferred`. If that commit fails, the caller
gets a defect and the request stays unprocessed, so a retry or the next drain runs it
again.

## Recovery needs traffic

Nothing in this package recovers pending work on its own. Rivet moves an actor off a lost node
only when something calls it, and the drain schedule runs inside the actor, so it
stops while the actor is stuck on a frozen node or failed to wake. If a node freezes, or an actor's `onWake` fails, its persisted
requests can stay pending indefinitely until a new request reaches that actor. No
sweeper is included; an application that needs recovery without traffic must call the
affected actors itself.

## Tests

`test/*.test.ts` run in the default suite, with each actor's SQLite in memory and no
engine.

The tests in `test/integration` start a Rivet engine and separate Node.js node processes,
then kill, freeze and resume them. They listen on fixed ports, need network, and do not
run in the default suite:

```sh
EFFECT_RIVET_TESTS=1 pnpm test --run packages/platform/rivet/test/integration
```

| Variable                           | Effect                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `EFFECT_RIVET_DATA_DIR`            | Where engine data goes. Defaults to the OS temp dir; the engine needs a few GB free there.     |
| `EFFECT_RIVET_NODE_LOST_THRESHOLD` | The engine's node-lost threshold in ms. Defaults to `5000`; `default` uses the engine default. |
| `EFFECT_RIVET_KEEP_LOGS`           | `1` keeps the engine, node and event logs after the run.                                       |
