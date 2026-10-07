import { NodeCrypto, NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, FileSystem, Latch, Layer, Option, Schedule, Schema } from "effect"
import { ClusterSchema, Entity, SingleRunner } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { SqlClient } from "effect/sql"

class Rejected extends Schema.TaggedError<Rejected>()("Rejected", {}) {}

const payload = { requestId: Schema.String }
const primaryKey = ({ requestId }: { readonly requestId: string }) => requestId

const rpcs = [
  Rpc.make("Accept", { payload, primaryKey, success: Schema.String }),
  Rpc.make("Reject", { payload, primaryKey, error: Rejected }),
  Rpc.make("DieOnce", { payload, primaryKey }),
  Rpc.make("Die", { payload, primaryKey }),
  Rpc.make("BlockOnce", { payload, primaryKey })
] as const

const makeEntity = (type: string, withTransaction: boolean) =>
  Entity.make(type, rpcs)
    .annotateRpcs(ClusterSchema.Persisted, true)
    .annotateRpcs(ClusterSchema.WithTransaction, withTransaction)

const makeHarness = Effect.fnUntraced(function*(options: {
  readonly withTransaction: boolean
  readonly disableFatalDefects?: boolean
}) {
  const entity = makeEntity(
    `${options.withTransaction ? "Tx" : "NoTx"}${options.disableFatalDefects ? "Terminal" : ""}`,
    options.withTransaction
  )
  const runs = new Map<string, number>()
  const gate = yield* Latch.make(true)
  const started = yield* Deferred.make<void>()

  const entityLayer = entity.toLayer(
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const record = (requestId: string) =>
        Effect.andThen(
          Effect.sync(() => runs.set(requestId, (runs.get(requestId) ?? 0) + 1)),
          sql`INSERT INTO handler_writes (request_id) VALUES (${requestId})`.pipe(Effect.orDie)
        )
      return entity.of({
        Accept: ({ payload }) => Effect.as(record(payload.requestId), "accepted"),
        Reject: ({ payload }) =>
          record(payload.requestId).pipe(
            Effect.andThen(Deferred.succeed(started, void 0)),
            Effect.andThen(gate.await),
            Effect.andThen(Effect.fail(new Rejected()))
          ),
        DieOnce: ({ payload }) =>
          Effect.andThen(
            record(payload.requestId),
            Effect.suspend(() => runs.get(payload.requestId) === 1 ? Effect.die("boom") : Effect.void)
          ),
        Die: ({ payload }) => Effect.andThen(record(payload.requestId), Effect.die("boom")),
        BlockOnce: ({ payload }) =>
          Effect.andThen(
            record(payload.requestId),
            Effect.suspend(() =>
              runs.get(payload.requestId) === 1
                ? Effect.andThen(Deferred.succeed(started, void 0), Effect.never)
                : Effect.void
            )
          )
      })
    }),
    {
      disableFatalDefects: options.disableFatalDefects,
      defectRetryPolicy: Schedule.forever
    }
  )

  // Each call starts a fresh runner over the same database.
  const runner = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.provide(entityLayer.pipe(
        Layer.provideMerge(SingleRunner.layer({
          runnerStorage: "memory",
          shardingConfig: { entityTerminationTimeout: 0 }
        })),
        Layer.provide(NodeCrypto.layer)
      ))
    )

  const client = Effect.map(entity.client, (make) => make("entity-1"))

  const committedWrites = Effect.fnUntraced(function*(requestId: string) {
    const sql = yield* SqlClient.SqlClient
    const rows = yield* sql<{ readonly count: number }>`
      SELECT COUNT(*) AS count FROM handler_writes WHERE request_id = ${requestId}
    `
    return rows[0].count
  })

  return {
    runs: (requestId: string) => runs.get(requestId) ?? 0,
    gate,
    started,
    runner,
    client,
    committedWrites
  } as const
})

const outcome = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.timeout("10 seconds"),
    Effect.exit,
    Effect.map((exit): string => {
      if (Exit.isSuccess(exit)) return "success"
      const error = Cause.findErrorOption(exit.cause)
      if (Option.isSome(error)) return (error.value as { readonly _tag: string })._tag
      if (Cause.hasDies(exit.cause)) return "die"
      return Cause.hasInterrupts(exit.cause) ? "interrupt" : "unknown"
    })
  )

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({ filename: dir + "/test.db" })
}).pipe(
  Layer.unwrap,
  Layer.provide(NodeFileSystem.layer),
  Layer.tap((context) =>
    SqlClient.SqlClient.use((sql) => sql`CREATE TABLE handler_writes (request_id TEXT NOT NULL)`).pipe(
      Effect.provideContext(context),
      Effect.orDie
    )
  )
)

describe("ClusterSchema.WithTransaction", () => {
  for (const withTransaction of [true, false]) {
    const label = withTransaction ? "with transaction" : "without transaction"
    const uncommitted = (attempts: number) => withTransaction ? 0 : attempts

    describe(label, { timeout: 60_000 }, () => {
      it.live("success commits the handler writes and the reply", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction })
          const call = Effect.flatMap(h.client, (client) => client.Accept({ requestId: "request-1" }))

          assert.strictEqual(yield* h.runner(outcome(call)), "success")
          assert.strictEqual(yield* h.runner(outcome(call)), "success")
          assert.strictEqual(h.runs("request-1"), 1)
          assert.strictEqual(yield* h.committedWrites("request-1"), 1)
        }).pipe(Effect.provide(SqliteLayer)))

      it.live("a typed failure is persisted and replayed to a retry on the same runner", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction })
          yield* h.runner(Effect.gen(function*() {
            const client = yield* h.client
            const call = client.Reject({ requestId: "request-1" })
            assert.strictEqual(yield* outcome(call), "Rejected")
            assert.strictEqual(yield* outcome(call), "Rejected")
          }))
          assert.strictEqual(h.runs("request-1"), 1)
          assert.strictEqual(yield* h.committedWrites("request-1"), uncommitted(1))
        }).pipe(Effect.provide(SqliteLayer)))

      it.live("a typed failure is replayed after a restart without rerunning the handler", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction })
          const call = Effect.flatMap(h.client, (client) => client.Reject({ requestId: "request-1" }))

          assert.strictEqual(yield* h.runner(outcome(call)), "Rejected")
          assert.strictEqual(yield* h.runner(outcome(call)), "Rejected")
          assert.strictEqual(h.runs("request-1"), 1)
          assert.strictEqual(yield* h.committedWrites("request-1"), uncommitted(1))
        }).pipe(Effect.provide(SqliteLayer)))

      it.live("a typed failure reaches a deduplicated concurrent caller", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction })
          yield* h.gate.close
          yield* h.runner(Effect.gen(function*() {
            const client = yield* h.client
            const call = outcome(client.Reject({ requestId: "request-1" }))
            const first = yield* Effect.forkChild(call)
            yield* Deferred.await(h.started)
            const second = yield* Effect.forkChild(call)
            yield* Effect.sleep("200 millis")
            yield* h.gate.open
            assert.strictEqual(yield* Fiber.join(first), "Rejected")
            assert.strictEqual(yield* Fiber.join(second), "Rejected")
          }))
          assert.strictEqual(h.runs("request-1"), 1)
          assert.strictEqual(yield* h.committedWrites("request-1"), uncommitted(1))
        }).pipe(Effect.provide(SqliteLayer)))

      it.live("a fatal defect is retried and only the successful attempt commits", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction })
          const call = Effect.flatMap(h.client, (client) => client.DieOnce({ requestId: "request-1" }))

          assert.strictEqual(yield* h.runner(outcome(call)), "success")
          assert.strictEqual(h.runs("request-1"), 2)
          assert.strictEqual(yield* h.committedWrites("request-1"), 1 + uncommitted(1))
        }).pipe(Effect.provide(SqliteLayer)))

      it.live("a non-fatal defect is persisted as the reply", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction, disableFatalDefects: true })
          const call = Effect.flatMap(h.client, (client) => client.Die({ requestId: "request-1" }))

          assert.strictEqual(yield* h.runner(outcome(call)), "die")
          assert.strictEqual(yield* h.runner(outcome(call)), "die")
          assert.strictEqual(h.runs("request-1"), 1)
          assert.strictEqual(yield* h.committedWrites("request-1"), uncommitted(1))
        }).pipe(Effect.provide(SqliteLayer)))

      it.live("a shutdown interrupt is not a reply and the request is redelivered", () =>
        Effect.gen(function*() {
          const h = yield* makeHarness({ withTransaction })
          const call = Effect.flatMap(h.client, (client) => client.BlockOnce({ requestId: "request-1" }))

          yield* h.runner(Effect.gen(function*() {
            yield* Effect.forkChild(call)
            yield* Deferred.await(h.started)
          }))
          assert.strictEqual(yield* h.runner(outcome(call)), "success")
          assert.strictEqual(h.runs("request-1"), 2)
          assert.strictEqual(yield* h.committedWrites("request-1"), 1 + uncommitted(1))
        }).pipe(Effect.provide(SqliteLayer)))
    })
  }
})
