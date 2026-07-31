import { assert, describe, it } from "@effect/vitest"
import { Cause, Clock, DateTime, Effect, Exit, Fiber, Latch, Option, PrimaryKey, Schema, Stream } from "effect"
import { ClusterSchema, DeliverAt, Entity } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"
import { type Backend, make } from "./harness.ts"

class KeyedPayload extends Schema.Class<KeyedPayload>("ClusterPersistenceKeyedPayload")({
  id: Schema.String
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

class ScheduledPayload extends Schema.Class<ScheduledPayload>("ClusterPersistenceScheduledPayload")({
  deliverAt: Schema.Number,
  id: Schema.String
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }

  [DeliverAt.symbol]() {
    return DateTime.makeUnsafe(this.deliverAt)
  }
}

const PersistedRpc = Rpc.make("Persisted", {
  payload: KeyedPayload,
  success: Schema.String
})

const StoredReplyRpc = Rpc.make("StoredReply", {
  payload: KeyedPayload,
  success: Schema.String
})

const UninterruptibleRpc = Rpc.make("Uninterruptible", {
  payload: KeyedPayload,
  success: Schema.String
}).annotate(ClusterSchema.Uninterruptible, true)

const VolatileRpc = Rpc.make("Volatile", {
  payload: KeyedPayload,
  success: Schema.String
}).annotate(ClusterSchema.Persisted, false)

const TypedFailureRpc = Rpc.make("TypedFailure", {
  error: Schema.String,
  payload: KeyedPayload,
  success: Schema.Never
})

const DefectRpc = Rpc.make("Defect", {
  payload: KeyedPayload,
  success: Schema.Never
})

const HealthyRpc = Rpc.make("Healthy", {
  payload: KeyedPayload,
  success: Schema.String
})

const StreamedRpc = Rpc.make("Streamed", {
  payload: KeyedPayload,
  success: RpcSchema.Stream(Schema.Number, Schema.Never)
})

const ScheduledRpc = Rpc.make("Scheduled", {
  payload: ScheduledPayload,
  success: Schema.Number
})

const PersistenceEntity = Entity.make("ClusterIntegrationPersistence", [
  PersistedRpc,
  StoredReplyRpc,
  UninterruptibleRpc,
  VolatileRpc,
  TypedFailureRpc,
  DefectRpc,
  HealthyRpc,
  StreamedRpc,
  ScheduledRpc
]).annotateRpcs(ClusterSchema.Persisted, true)

const freshState = () => ({
  completedUninterruptible: 0,
  completedVolatile: 0,
  counts: new Map<string, number>(),
  scheduledDeliveries: [] as Array<number>,
  streamThirdEntered: Latch.makeUnsafe(),
  streamThirdGate: Latch.makeUnsafe(),
  uninterruptibleEntered: Latch.makeUnsafe(),
  uninterruptibleGate: Latch.makeUnsafe(),
  volatileEntered: Latch.makeUnsafe(),
  volatileGate: Latch.makeUnsafe()
})

let state = freshState()

const resetState = () => {
  state = freshState()
}

const increment = (tag: string, id: string) => {
  const key = `${tag}:${id}`
  const next = (state.counts.get(key) ?? 0) + 1
  state.counts.set(key, next)
  return next
}

const count = (tag: string, id: string) => state.counts.get(`${tag}:${id}`) ?? 0

const PersistenceEntityLayer = PersistenceEntity.toLayer({
  Defect: ({ payload }) =>
    Effect.sync(() => increment("Defect", payload.id)).pipe(
      Effect.andThen(Effect.die(`defect:${payload.id}`))
    ),
  Healthy: ({ payload }) =>
    Effect.sync(() => {
      increment("Healthy", payload.id)
      return `healthy:${payload.id}`
    }),
  Persisted: ({ payload }) =>
    Effect.sync(() => {
      increment("Persisted", payload.id)
      return `persisted:${payload.id}`
    }),
  Scheduled: Effect.fnUntraced(function*({ payload }) {
    increment("Scheduled", payload.id)
    const deliveredAt = yield* Clock.currentTimeMillis
    state.scheduledDeliveries.push(deliveredAt)
    return deliveredAt
  }),
  StoredReply: ({ payload }) =>
    Effect.sync(() => {
      increment("StoredReply", payload.id)
      return `stored:${payload.id}`
    }),
  Streamed: (request) => {
    increment("Streamed", request.payload.id)
    const start = Option.match(request.lastSentChunkValue, {
      onNone: () => 0,
      onSome: (value) => value + 1
    })
    return Stream.fromIterable([0, 1, 2, 3, 4].slice(start)).pipe(
      Stream.mapEffect((value) => {
        if (request.payload.id.endsWith("-restart") && value === 2) {
          state.streamThirdEntered.openUnsafe()
          return Effect.as(state.streamThirdGate.await, value)
        }
        return Effect.succeed(value)
      }),
      Stream.rechunk(1)
    )
  },
  TypedFailure: ({ payload }) =>
    Effect.sync(() => increment("TypedFailure", payload.id)).pipe(
      Effect.andThen(Effect.fail(`typed:${payload.id}`))
    ),
  Uninterruptible: Effect.fnUntraced(function*({ payload }) {
    increment("Uninterruptible", payload.id)
    state.uninterruptibleEntered.openUnsafe()
    yield* state.uninterruptibleGate.await
    state.completedUninterruptible++
    return `uninterruptible:${payload.id}`
  }),
  Volatile: Effect.fnUntraced(function*({ payload }) {
    increment("Volatile", payload.id)
    state.volatileEntered.openUnsafe()
    yield* state.volatileGate.await
    state.completedVolatile++
    return `volatile:${payload.id}`
  })
}, { disableFatalDefects: true })

describe("cluster message persistence integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.live(`${backend}: delivers a persisted request sent while its runner is down exactly once`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const owner = yield* cluster.ownerOfEntity(PersistenceEntity, "restart")
        yield* cluster.kill(owner!)

        const client = yield* cluster.getClient(PersistenceEntity)
        const replyFiber = yield* client("restart").Persisted(
          new KeyedPayload({ id: `${backend}-restart` })
        ).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil(
          "The request was not persisted while the runner was down",
          Effect.map(cluster.unprocessedMessageCount, (value) => value === 1)
        )

        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        assert.strictEqual(yield* Fiber.join(replyFiber), `persisted:${backend}-restart`)
        yield* cluster.waitUntil(
          "The persisted reply was not recorded",
          Effect.map(cluster.repliedMessageCount, (value) => value === 1)
        )
        assert.strictEqual(count("Persisted", `${backend}-restart`), 1)
        assert.deepStrictEqual(yield* cluster.messageCounts(), {
          failed: 0,
          replied: 1,
          unprocessed: 0
        })
      }))

    it.live(`${backend}: serves primary-key duplicates from the stored reply`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-stored`
        const payload = new KeyedPayload({ id })

        assert.strictEqual(yield* client("stored").StoredReply(payload), `stored:${id}`)
        const firstOwner = yield* cluster.ownerOfEntity(PersistenceEntity, "stored")
        yield* cluster.kill(firstOwner!)
        yield* cluster.waitForStableAssignments()

        assert.strictEqual(yield* client("stored").StoredReply(payload), `stored:${id}`)
        assert.strictEqual(count("StoredReply", id), 1)
        assert.deepStrictEqual(yield* cluster.messageCounts(), {
          failed: 0,
          replied: 1,
          unprocessed: 0
        })
      }))

    it.live(`${backend}: does not lose an uninterruptible request during runner shutdown`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({
          backend,
          config: { entityTerminationTimeout: 100 },
          entities: PersistenceEntityLayer
        })
        const [owner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-uninterruptible`
        const replyFiber = yield* client("uninterruptible").Uninterruptible(
          new KeyedPayload({ id })
        ).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil(
          "The uninterruptible handler did not start",
          Effect.as(state.uninterruptibleEntered.await, true)
        )

        const stopping = yield* cluster.stop(owner).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The uninterruptible request was not resumed by the replacement runner",
          Effect.sync(() => count("Uninterruptible", id) >= 2)
        )
        state.uninterruptibleGate.openUnsafe()
        yield* cluster.waitUntil(
          "The resumed uninterruptible request did not complete",
          Effect.sync(() => state.completedUninterruptible === 1)
        )

        assert.strictEqual(yield* Fiber.join(replyFiber), `uninterruptible:${id}`)
        yield* Fiber.join(stopping)
        assert.strictEqual(yield* cluster.repliedMessageCount, 1)
      }))

    it.live(`${backend}: does not store or redeliver a volatile request after runner failure`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({
          backend,
          config: { entityTerminationTimeout: 100 },
          entities: PersistenceEntityLayer
        })
        const [owner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-volatile`
        const requestFiber = yield* client("volatile").Volatile(
          new KeyedPayload({ id }),
          { discard: true }
        ).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil(
          "The volatile handler did not start",
          Effect.as(state.volatileEntered.await, true)
        )

        yield* cluster.kill(owner)
        yield* Fiber.interrupt(requestFiber)
        state.volatileGate.openUnsafe()
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const observationDeadline = (yield* Clock.currentTimeMillis) + 1_000
        yield* cluster.waitUntil(
          "The volatile redelivery observation window did not elapse",
          Effect.map(Clock.currentTimeMillis, (now) => now >= observationDeadline),
          "2 seconds"
        )

        assert.strictEqual(count("Volatile", id), 1)
        assert.strictEqual(state.completedVolatile, 0)
        assert.deepStrictEqual(yield* cluster.messageCounts(), {
          failed: 0,
          replied: 0,
          unprocessed: 0
        })
      }))

    it.live(`${backend}: persists typed failures and defects without wedging the mailbox`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const typedId = `${backend}-typed`
        const defectId = `${backend}-defect`

        assert.strictEqual(
          yield* client("failures").TypedFailure(new KeyedPayload({ id: typedId })).pipe(Effect.flip),
          `typed:${typedId}`
        )
        assert.strictEqual(
          yield* client("failures").TypedFailure(new KeyedPayload({ id: typedId })).pipe(Effect.flip),
          `typed:${typedId}`
        )
        assert.strictEqual(count("TypedFailure", typedId), 1)

        const firstDefect = yield* client("failures").Defect(
          new KeyedPayload({ id: defectId })
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(firstDefect))
        if (Exit.isFailure(firstDefect)) {
          assert.include(Cause.pretty(firstDefect.cause), `defect:${defectId}`)
        }
        const storedDefect = yield* client("failures").Defect(
          new KeyedPayload({ id: defectId })
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(storedDefect))
        if (Exit.isFailure(storedDefect)) {
          assert.include(Cause.pretty(storedDefect.cause), `defect:${defectId}`)
        }
        assert.strictEqual(count("Defect", defectId), 1)

        assert.strictEqual(
          yield* client("failures").Healthy(new KeyedPayload({ id: `${backend}-healthy` })),
          `healthy:${backend}-healthy`
        )
        yield* cluster.waitUntil(
          "The failure replies were not persisted",
          Effect.map(cluster.messageCounts(), (counts) => counts.failed === 2 && counts.replied === 1)
        )
        assert.deepStrictEqual(yield* cluster.messageCounts(), {
          failed: 2,
          replied: 1,
          unprocessed: 0
        })
      }))

    it.live(`${backend}: round-trips a chunked reply through storage`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-stream`
        const values = yield* client("stream").Streamed(new KeyedPayload({ id })).pipe(Stream.runCollect)
        assert.deepStrictEqual(Array.from(values), [0, 1, 2, 3, 4])
        yield* cluster.waitUntil(
          "The terminal stream reply was not persisted",
          Effect.map(cluster.repliedMessageCount, (value) => value === 1)
        )
        assert.strictEqual(count("Streamed", id), 1)
      }))

    it.live(`${backend}: resumes a persisted stream after its runner is killed`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        const [owner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-stream-restart`
        const received: Array<number> = []
        const valuesFiber = yield* client("stream-restart").Streamed(new KeyedPayload({ id })).pipe(
          Stream.tap((value) => Effect.sync(() => received.push(value))),
          Stream.runCollect,
          Effect.forkChild({ startImmediately: true })
        )
        yield* cluster.waitUntil(
          "The stream did not deliver two chunks before blocking the third",
          Effect.sync(() => received.length === 2 && received[0] === 0 && received[1] === 1)
        )
        yield* cluster.waitUntil(
          "The stream handler did not block before delivering its third chunk",
          Effect.as(state.streamThirdEntered.await, true)
        )

        yield* cluster.kill(owner)
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The replacement runner did not resume the persisted stream",
          Effect.sync(() => count("Streamed", id) === 2)
        )
        state.streamThirdGate.openUnsafe()

        assert.deepStrictEqual(Array.from(yield* Fiber.join(valuesFiber)), [0, 1, 2, 3, 4])
        yield* cluster.waitUntil(
          "The terminal stream reply was not persisted after recovery",
          Effect.map(
            cluster.messageCounts(),
            (counts) => counts.replied === 1 && counts.unprocessed === 0
          )
        )
        assert.deepStrictEqual(yield* cluster.messageCounts(), {
          failed: 0,
          replied: 1,
          unprocessed: 0
        })
      }))

    it.live(`${backend}: delivers scheduled messages only after their deadline`, () =>
      Effect.gen(function*() {
        resetState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-scheduled`
        const deliverAt = (yield* Clock.currentTimeMillis) + 1_500
        const replyFiber = yield* client("scheduled").Scheduled(
          new ScheduledPayload({ deliverAt, id })
        ).pipe(Effect.forkChild({ startImmediately: true }))

        yield* cluster.waitUntil(
          "The early-delivery observation point was not reached",
          Effect.map(Clock.currentTimeMillis, (now) => now >= deliverAt - 500),
          "2 seconds"
        )
        assert.strictEqual(count("Scheduled", id), 0)
        assert.deepStrictEqual(state.scheduledDeliveries, [])

        yield* cluster.waitUntil(
          "The scheduled message was not delivered after its deadline",
          Effect.sync(() => state.scheduledDeliveries.length === 1),
          "5 seconds"
        )
        yield* cluster.waitUntil(
          "The scheduled reply was not persisted",
          Effect.map(cluster.repliedMessageCount, (value) => value === 1)
        )
        const deliveredAt = yield* Fiber.join(replyFiber)
        assert.isAtLeast(deliveredAt, deliverAt)
        assert.strictEqual(state.scheduledDeliveries[0], deliveredAt)
      }))
  }
})
