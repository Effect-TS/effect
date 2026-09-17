import { ClusterSchema, Entity } from "@effect/cluster"
import { Rpc, RpcSchema } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Clock, Effect, Exit, Fiber, Option, PrimaryKey, Schema, Stream } from "effect"
import { type Backend, make } from "./harness.js"

class KeyedPayload extends Schema.Class<KeyedPayload>("ClusterPersistenceKeyedPayload")({ id: Schema.String }) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}
const PersistenceEntity = Entity.make("ClusterIntegrationPersistence", [
  Rpc.make("Persisted", { payload: KeyedPayload, success: Schema.String }),
  Rpc.make("StoredReply", { payload: KeyedPayload, success: Schema.String }),
  Rpc.make("Volatile", { payload: KeyedPayload, success: Schema.String }).annotate(ClusterSchema.Persisted, false),
  Rpc.make("TypedFailure", { payload: KeyedPayload, error: Schema.String }),
  Rpc.make("Defect", { payload: KeyedPayload }),
  Rpc.make("Healthy", { payload: KeyedPayload, success: Schema.String }),
  Rpc.make("Streamed", {
    payload: KeyedPayload,
    success: RpcSchema.Stream({ success: Schema.Number, failure: Schema.Never })
  })
]).annotateRpcs(ClusterSchema.Persisted, true)
const freshState = () => ({
  counts: new Map<string, number>(),
  completedVolatile: 0,
  volatileEntered: Effect.unsafeMakeLatch(),
  volatileGate: Effect.unsafeMakeLatch(),
  streamThirdEntered: Effect.unsafeMakeLatch(),
  streamThirdGate: Effect.unsafeMakeLatch(),
  streamTerminalEntered: Effect.unsafeMakeLatch(),
  streamTerminalGate: Effect.unsafeMakeLatch()
})
let state = freshState()
const increment = (tag: string, id: string) => {
  const key = `${tag}:${id}`, next = (state.counts.get(key) ?? 0) + 1
  state.counts.set(key, next)
  return next
}
const count = (tag: string, id: string) => state.counts.get(`${tag}:${id}`) ?? 0
const PersistenceEntityLayer = PersistenceEntity.toLayer({
  Persisted: ({ payload }) =>
    Effect.sync(() => {
      increment("Persisted", payload.id)
      return `persisted:${payload.id}`
    }),
  StoredReply: ({ payload }) =>
    Effect.sync(() => {
      increment("StoredReply", payload.id)
      return `stored:${payload.id}`
    }),
  Healthy: ({ payload }) =>
    Effect.sync(() => {
      increment("Healthy", payload.id)
      return `healthy:${payload.id}`
    }),
  TypedFailure: ({ payload }) =>
    Effect.sync(() => increment("TypedFailure", payload.id)).pipe(Effect.andThen(Effect.fail(`typed:${payload.id}`))),
  Defect: ({ payload }) =>
    Effect.sync(() => increment("Defect", payload.id)).pipe(Effect.andThen(Effect.die(`defect:${payload.id}`))),
  Volatile: Effect.fnUntraced(function*({ payload }) {
    increment("Volatile", payload.id)
    yield* state.volatileEntered.open
    yield* state.volatileGate.await
    state.completedVolatile++
    return `volatile:${payload.id}`
  }),
  Streamed: (request) => {
    increment("Streamed", request.payload.id)
    const start = Option.match(request.lastSentChunkValue, { onNone: () => 0, onSome: (value) => value + 1 })
    const values = request.payload.id.endsWith("-terminal-race") ? [0] : [0, 1, 2, 3, 4]
    const stream = Stream.fromIterable(values.slice(start)).pipe(
      Stream.mapEffect((value) => {
        if (request.payload.id.endsWith("-restart") && value === 2) {
          state.streamThirdEntered.unsafeOpen()
          return Effect.as(state.streamThirdGate.await, value)
        }
        return Effect.succeed(value)
      }),
      Stream.rechunk(1)
    )
    if (!request.payload.id.endsWith("-terminal-race")) return stream
    return Stream.concat(
      stream,
      Stream.fromEffect(state.streamTerminalEntered.open.pipe(Effect.andThen(state.streamTerminalGate.await))).pipe(
        Stream.drain
      )
    )
  }
}, { disableFatalDefects: true })

describe("cluster message persistence integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.scopedLive(`${backend}: delivers a persisted request sent while its runner is down exactly once`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const owner = yield* cluster.ownerOfEntity(PersistenceEntity, "restart")
        yield* cluster.kill(owner!)
        const client = yield* cluster.getClient(PersistenceEntity)
        const reply = yield* client("restart").Persisted(new KeyedPayload({ id: `${backend}-restart` })).pipe(
          Effect.forkScoped
        )
        yield* cluster.waitUntil(
          "The request was not persisted while the runner was down",
          Effect.map(cluster.unprocessedMessageCount, (count) => count === 1)
        )
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        assert.strictEqual(yield* Fiber.join(reply), `persisted:${backend}-restart`)
        yield* cluster.waitUntil(
          "The persisted reply was not recorded",
          Effect.map(cluster.repliedMessageCount, (count) => count === 1)
        )
        assert.strictEqual(count("Persisted", `${backend}-restart`), 1)
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 1, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: serves primary-key duplicates from the stored reply`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity)
        const id = `${backend}-stored`, payload = new KeyedPayload({ id })
        assert.strictEqual(yield* client("stored").StoredReply(payload), `stored:${id}`)
        const firstOwner = yield* cluster.ownerOfEntity(PersistenceEntity, "stored")
        yield* cluster.kill(firstOwner!)
        yield* cluster.waitForStableAssignments()
        assert.strictEqual(yield* client("stored").StoredReply(payload), `stored:${id}`)
        assert.strictEqual(count("StoredReply", id), 1)
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 1, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: does not store or redeliver a volatile request after runner failure`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({
          backend,
          config: { entityTerminationTimeout: 100 },
          entities: PersistenceEntityLayer
        })
        const [owner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity), id = `${backend}-volatile`
        const request = yield* client("volatile").Volatile(new KeyedPayload({ id }), { discard: true }).pipe(
          Effect.forkScoped
        )
        yield* cluster.waitUntil("The volatile handler did not start", Effect.as(state.volatileEntered.await, true))
        yield* cluster.kill(owner)
        yield* Fiber.interrupt(request)
        yield* state.volatileGate.open
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const deadline = (yield* Clock.currentTimeMillis) + 1_000
        yield* cluster.waitUntil(
          "The volatile redelivery observation window did not elapse",
          Effect.map(Clock.currentTimeMillis, (now) => now >= deadline),
          "2 seconds"
        )
        assert.strictEqual(count("Volatile", id), 1)
        assert.strictEqual(state.completedVolatile, 0)
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 0, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: completes a discarded volatile caller while the handler is still blocked`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({
          backend,
          config: { entityTerminationTimeout: 100 },
          entities: PersistenceEntityLayer
        })
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity), id = `${backend}-discarded-volatile`
        const caller = yield* client("discarded-volatile").Volatile(new KeyedPayload({ id }), { discard: true }).pipe(
          Effect.forkScoped
        )
        yield* cluster.waitUntil(
          "The discarded volatile handler did not start",
          Effect.as(state.volatileEntered.await, true)
        )
        yield* cluster.waitUntil(
          "The discarded volatile caller waited for the blocked handler",
          Effect.map(Fiber.poll(caller), Option.isSome)
        )
        yield* Fiber.join(caller)
        assert.strictEqual(count("Volatile", id), 1)
      }))
    it.scopedLive(`${backend}: persists typed failures and defects without wedging the mailbox`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity),
          typedId = `${backend}-typed`,
          defectId = `${backend}-defect`
        for (let attempt = 0; attempt < 2; attempt++) {
          assert.strictEqual(
            yield* client("failures").TypedFailure(new KeyedPayload({ id: typedId })).pipe(Effect.flip),
            `typed:${typedId}`
          )
        }
        assert.strictEqual(count("TypedFailure", typedId), 1)
        for (let attempt = 0; attempt < 2; attempt++) {
          const exit = yield* client("failures").Defect(new KeyedPayload({ id: defectId })).pipe(Effect.exit)
          assert.isTrue(Exit.isFailure(exit))
          if (Exit.isFailure(exit)) assert.include(Cause.pretty(exit.cause), `defect:${defectId}`)
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
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 2, replied: 1, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: abandons a stream chunk acknowledgement during shutdown without stranding either runner`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        const runners = yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity),
          entityId = `${backend}-shutdown-stream`,
          id = `${entityId}-restart`
        const owner = yield* cluster.ownerOfEntity(PersistenceEntity, entityId)
        assert.isDefined(owner)
        const peer = runners.find((r) => r !== owner)
        assert.isDefined(peer)
        const values = yield* client(entityId).Streamed(new KeyedPayload({ id })).pipe(
          Stream.runCollect,
          Effect.forkScoped
        )
        yield* cluster.waitUntil(
          "The stream handler did not reach its third chunk",
          Effect.as(state.streamThirdEntered.await, true)
        )
        const stopping = yield* cluster.stop(owner!).pipe(Effect.forkScoped)
        yield* state.streamThirdGate.open
        yield* Fiber.join(stopping)
        yield* cluster.waitForStableAssignments()
        const healthyId = `${backend}-shutdown-stream-healthy`
        assert.strictEqual(yield* client(entityId).Healthy(new KeyedPayload({ id: healthyId })), `healthy:${healthyId}`)
        assert.deepStrictEqual(Array.from(yield* Fiber.join(values)), [0, 1, 2, 3, 4])
        assert.strictEqual(yield* cluster.ownerOfEntity(PersistenceEntity, entityId), peer)
      }))
    it.scopedLive(`${backend}: round-trips a chunked reply through storage`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity), id = `${backend}-stream`
        const values = yield* client("stream").Streamed(new KeyedPayload({ id })).pipe(Stream.runCollect)
        assert.deepStrictEqual(Array.from(values), [0, 1, 2, 3, 4])
        yield* cluster.waitUntil(
          "The terminal stream reply was not persisted",
          Effect.map(cluster.repliedMessageCount, (count) => count === 1)
        )
        assert.strictEqual(count("Streamed", id), 1)
      }))
    it.scopedLive(`${backend}: resumes a persisted stream after its runner is killed`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        const [owner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity), id = `${backend}-stream-restart`
        const received: Array<number> = []
        const values = yield* client("stream-restart").Streamed(new KeyedPayload({ id })).pipe(
          Stream.tap((value) => Effect.sync(() => received.push(value))),
          Stream.runCollect,
          Effect.forkScoped
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
        yield* state.streamThirdGate.open
        assert.deepStrictEqual(Array.from(yield* Fiber.join(values)), [0, 1, 2, 3, 4])
        yield* cluster.waitUntil(
          "The terminal stream reply was not persisted after recovery",
          Effect.map(cluster.messageCounts(), (counts) => counts.replied === 1 && counts.unprocessed === 0)
        )
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 1, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: resumes a terminal stream on the replacement owner and persists exactly one reply`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities: PersistenceEntityLayer })
        const runners = yield* cluster.start(2)
        yield* Effect.addFinalizer(() => state.streamTerminalGate.open)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity), entityId = `${backend}-terminal-race`, id = entityId
        const owner = yield* cluster.ownerOfEntity(PersistenceEntity, entityId)
        assert.isDefined(owner)
        const peer = runners.find((r) => r !== owner)
        assert.isDefined(peer)
        const received: Array<number> = []
        const values = yield* client(entityId).Streamed(new KeyedPayload({ id })).pipe(
          Stream.tap((value) => Effect.sync(() => received.push(value))),
          Stream.runCollect,
          Effect.forkScoped
        )
        yield* cluster.waitUntil(
          "The first owner did not reach terminal stream completion",
          Effect.as(state.streamTerminalEntered.await, true)
        )
        yield* cluster.waitUntil(
          "The client did not receive the final stream value before owner death",
          Effect.sync(() => received.length === 1)
        )
        assert.deepStrictEqual(received, [0])
        yield* cluster.kill(owner!)
        yield* cluster.waitUntil(
          "The entity did not move to the peer",
          Effect.map(cluster.ownerOfEntity(PersistenceEntity, entityId), (owner) => owner === peer)
        )
        yield* cluster.waitUntil(
          "The replacement owner did not resume the terminal stream",
          Effect.sync(() => count("Streamed", id) === 2)
        )
        yield* state.streamTerminalGate.open
        assert.deepStrictEqual(Array.from(yield* Fiber.join(values)), [0])
        yield* cluster.waitUntil(
          "The surviving terminal stream reply was not persisted",
          Effect.map(cluster.messageCounts(), (counts) => counts.replied === 1 && counts.unprocessed === 0)
        )
        assert.strictEqual(count("Streamed", id), 2)
        assert.strictEqual(yield* cluster.ownerOfEntity(PersistenceEntity, entityId), peer)
      }))
  }
})
