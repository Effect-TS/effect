import { ClusterSchema, ClusterWorkflowEngine, Entity, RunnerAddress, ShardId, Sharding } from "@effect/cluster"
import { NodeClusterSocket } from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import { SqlClient } from "@effect/sql"
import { PgClient } from "@effect/sql-pg"
import type { WorkflowEngine } from "@effect/workflow"
import { Activity, DurableDeferred, Workflow } from "@effect/workflow"
import { Chunk, Effect, Exit, Fiber, Layer, Option, Redacted, Schema, Scope, Stream } from "effect"

const worker = process.env.CLUSTER_TEST_WORKER!
const port = Number(process.env.CLUSTER_TEST_PORT)
const clientOnly = worker === "client"
const counts = {
  requests: 24,
  workflows: Number(process.env.EFFECT_CLUSTER_WORKFLOWS ?? 6),
  children: 3,
  streams: 6,
  partialStreams: 3,
  elements: 8
}
const signal = DurableDeferred.make("release", { success: Schema.String })
const Child = Workflow.make({
  name: "MultiRunnerChild",
  payload: { id: Schema.String, index: Schema.Number },
  success: Schema.Number,
  idempotencyKey: ({ id, index }) => `${id}/${index}`
})
const Parent = Workflow.make({
  name: "MultiRunnerParent",
  payload: { id: Schema.String },
  success: Schema.Array(Schema.Number),
  idempotencyKey: ({ id }) => id
})
const Race = Workflow.make({
  name: "MultiRunnerRace",
  payload: { id: Schema.String },
  success: Schema.String,
  idempotencyKey: ({ id }) => id
})
const Work = Entity.make("MultiRunnerWork", [
  Rpc.make("Run", {
    payload: { id: Schema.String, value: Schema.Number },
    success: Schema.Number,
    primaryKey: ({ id }) => id
  }),
  Rpc.make("Stream", {
    payload: { id: Schema.String, partial: Schema.Boolean },
    success: Schema.Number,
    stream: true,
    primaryKey: ({ id }) => id
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

const waitGate = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  while (true) {
    const rows = yield* sql<{ released: boolean }>`SELECT released FROM integration_gate`
    if (rows[0].released) return
    yield* Effect.sleep(50)
  }
}).pipe(Effect.orDie)

const audit = <A, E, R>(kind: string, key: string, effect: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const rows = yield* sql<{ id: number }>`INSERT INTO integration_attempts (worker, kind, key)
        VALUES (${worker}, ${kind}, ${key}) RETURNING id`
      return rows[0].id
    }).pipe(Effect.orDie),
    () => effect,
    (id) =>
      Effect.flatMap(SqlClient.SqlClient, (sql) =>
        sql`UPDATE integration_attempts SET ended = clock_timestamp() WHERE id = ${id}`).pipe(Effect.orDie)
  )

const registrations = Layer.mergeAll(
  Work.toLayer({
    Run: ({ payload }) => audit("request", payload.id, waitGate.pipe(Effect.as(payload.value * 2))),
    Stream: (request) =>
      Stream.unwrapScoped(
        Effect.gen(function*() {
          const { payload } = request
          const next = request.lastSentChunkValue.pipe(
            Option.map((value) => value + 1),
            Option.getOrElse(() => 0)
          )
          const remaining = (start: number, end: number) => start <= end ? Stream.range(start, end) : Stream.empty
          const sql = yield* SqlClient.SqlClient
          const rows = yield* sql<{ id: number }>`INSERT INTO integration_attempts (worker, kind, key)
        VALUES (${worker}, 'stream', ${payload.id}) RETURNING id`
          yield* Effect.addFinalizer(() =>
            sql`UPDATE integration_attempts SET ended = clock_timestamp()
        WHERE id = ${rows[0].id}`.pipe(Effect.orDie)
          )
          return payload.partial ?
            Stream.concat(
              remaining(next, 1),
              Stream.fromEffect(waitGate).pipe(Stream.flatMap(() => remaining(Math.max(next, 2), counts.elements - 1)))
            ) :
            Stream.fromEffect(waitGate).pipe(Stream.flatMap(() => remaining(next, counts.elements - 1)))
        }).pipe(Effect.orDie)
      )
  }),
  Child.toLayer(({ id, index }) =>
    audit("child", `${id}/${index}`, DurableDeferred.await(signal).pipe(Effect.as(index)))
  ),
  Parent.toLayer(({ id }) =>
    audit(
      "parent",
      id,
      Activity.make({
        name: "fanout",
        success: Schema.Array(Schema.Number),
        execute: Effect.forEach(
          Array.from({ length: counts.children }, (_, index) => index),
          (index) => Child.execute({ id, index }),
          { concurrency: "unbounded" }
        )
      })
    )
  ),
  Race.toLayer(({ id }) =>
    audit(
      "race",
      id,
      DurableDeferred.raceAll({
        name: "race",
        success: Schema.String,
        error: Schema.Never,
        effects: [
          DurableDeferred.await(signal),
          Activity.make({
            name: "held",
            success: Schema.String,
            execute: waitGate.pipe(Effect.as("activity"))
          })
        ]
      })
    )
  )
)

const engine = ClusterWorkflowEngine.layer.pipe(Layer.provideMerge(NodeClusterSocket.layer({
  clientOnly,
  storage: "sql",
  serialization: "ndjson",
  shardingConfig: {
    runnerAddress: clientOnly ? Option.none() : Option.some(RunnerAddress.make("127.0.0.1", port)),
    shardsPerGroup: 12,
    refreshAssignmentsInterval: 100,
    shardLockRefreshInterval: 250,
    shardLockExpiration: 3000,
    entityMessagePollInterval: 100,
    entityReplyPollInterval: 50,
    sendRetryInterval: 50,
    runnerHealthCheckInterval: 500,
    entityTerminationTimeout: 1000,
    entityRegistrationTimeout: 10_000,
    preemptiveShutdown: true
  }
})))
const app = (clientOnly ? engine : registrations.pipe(Layer.provideMerge(engine))).pipe(
  Layer.provideMerge(PgClient.layer({
    url: Redacted.make(process.env.CLUSTER_TEST_PG!),
    applicationName: worker,
    maxConnections: 20
  }))
)

const main = Effect.gen(function*() {
  const scope = yield* Scope.make()
  const context = yield* Layer.build(app).pipe(Scope.extend(scope))
  const sharding = yield* Effect.provide(Sharding.Sharding, context)
  let requests: Fiber.RuntimeFiber<Array<Exit.Exit<number, unknown>>> | undefined
  let streams: Fiber.RuntimeFiber<Array<Exit.Exit<Array<number>, unknown>>> | undefined
  const parentIds = Array.from({ length: counts.workflows }, (_, i) => `parent-${i}`)
  const raceIds = Array.from({ length: counts.workflows }, (_, i) => `race-${i}`)
  const waitResult = <A>(workflow: typeof Parent | typeof Race, id: string) =>
    Effect.gen(function*() {
      const executionId = yield* workflow.executionId({ id })
      while (true) {
        const result = yield* workflow.poll(executionId)
        if (result?._tag === "Complete") return yield* result.exit as Exit.Exit<A>
        yield* Effect.sleep(100)
      }
    })
  const submit = Effect.gen(function*() {
    const client = yield* Work.client
    requests = yield* Effect.forEach(
      Array.from({ length: counts.requests }, (_, i) => i),
      (value) => client(`request-${value}`).Run({ id: `request-${value}`, value }).pipe(Effect.exit),
      { concurrency: "unbounded" }
    ).pipe(Effect.forkIn(scope))
    streams = yield* Effect.forEach(
      Array.from({ length: counts.streams }, (_, i) => i),
      (i) =>
        client(`stream-${i}`).Stream({ id: `stream-${i}`, partial: i < counts.partialStreams }).pipe(
          Stream.tap((value) => Effect.sync(() => process.send?.({ event: "element", stream: i, value }))),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
          Effect.exit,
          Effect.tap((exit) => Effect.sync(() => process.send?.({ event: "stream-exit", stream: i, tag: exit._tag })))
        ),
      { concurrency: "unbounded" }
    ).pipe(Effect.forkIn(scope))
    yield* Effect.forEach(parentIds, (id) => Parent.execute({ id }, { discard: true }), { concurrency: "unbounded" })
    yield* Effect.forEach(raceIds, (id) => Race.execute({ id }, { discard: true }), { concurrency: "unbounded" })
    return counts
  })
  const release = Effect.gen(function*() {
    yield* Effect.forEach(parentIds, (id) =>
      Effect.forEach(
        Array.from({ length: counts.children }, (_, index) => index),
        (index) =>
          Effect.flatMap(Child.executionId({ id, index }), (executionId) =>
            DurableDeferred.succeed(signal, {
              token: DurableDeferred.tokenFromExecutionId(signal, { workflow: Child, executionId }),
              value: "signal"
            })),
        { concurrency: "unbounded" }
      ), { concurrency: "unbounded" })
    yield* Effect.forEach(
      raceIds,
      (id) =>
        Effect.flatMap(Race.executionId({ id }), (executionId) =>
          DurableDeferred.succeed(signal, {
            token: DurableDeferred.tokenFromExecutionId(signal, { workflow: Race, executionId }),
            value: "signal"
          })),
      { concurrency: "unbounded" }
    )
    return yield* Effect.forEach(
      raceIds,
      (id) => waitResult<string>(Race, id).pipe(Effect.timeout(15_000), Effect.exit),
      { concurrency: "unbounded" }
    )
  })
  const results = Effect.suspend(() =>
    Effect.all({
      requests: Fiber.join(requests!).pipe(Effect.timeout(30_000), Effect.exit),
      streams: Fiber.join(streams!).pipe(Effect.timeout(30_000), Effect.exit),
      parents: Effect.forEach(parentIds, (id) =>
        waitResult<Array<number>>(Parent, id).pipe(Effect.timeout(60_000), Effect.exit), { concurrency: "unbounded" }),
      races: Effect.forEach(raceIds, (id) =>
        waitResult<string>(Race, id).pipe(Effect.timeout(60_000), Effect.exit), { concurrency: "unbounded" })
    }, { concurrency: "unbounded" })
  )
  const poll = Effect.forEach(parentIds, (id) => Effect.flatMap(Parent.executionId({ id }), Parent.poll))
  const stop = () =>
    Effect.runPromise(Scope.close(scope, Exit.void)).then(
      () => process.exit(0),
      (error) => {
        process.stderr.write(String(error))
        process.exit(1)
      }
    )
  process.on("SIGTERM", stop)
  process.on("disconnect", stop)
  process.on("message", (message: { id: number; command: string }) => {
    const effect: Effect.Effect<unknown, unknown, Sharding.Sharding | WorkflowEngine.WorkflowEngine> =
      message.command === "submit" ?
        submit
        : message.command === "release" ?
        release
        : message.command === "results" ?
        results
        : message.command === "poll" ?
        poll
        : Effect.sync(() =>
          Array.from({ length: 12 }, (_, i) => i + 1)
            .filter((i) => sharding.hasShardId(ShardId.make("default", i)))
        )
    Effect.runPromise(Effect.provide(effect, context)).then(
      (value) => process.send?.({ id: message.id, value }),
      (error) => process.send?.({ id: message.id, error: String(error) })
    )
  })
  process.send?.({ event: "ready", worker, pid: process.pid, port, counts })
})

Effect.runPromise(main).catch((error) => {
  process.stderr.write(String(error))
  process.exit(1)
})
