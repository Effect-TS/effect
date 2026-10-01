import { ClusterSchema, DeliverAt, Entity, EntityId } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Clock, DateTime, Effect, Fiber, PrimaryKey, Schema } from "effect"
import { type Backend, make } from "./harness.js"

class KeyedPayload extends Schema.Class<KeyedPayload>("ClusterPersistenceKeyedPayload")({ id: Schema.String }) {
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
    return DateTime.unsafeMake(this.deliverAt)
  }
}
const PersistenceEntity = Entity.make("ClusterIntegrationPersistence", [
  Rpc.make("Uninterruptible", { payload: KeyedPayload, success: Schema.String }).annotate(
    ClusterSchema.Uninterruptible,
    true
  ),
  Rpc.make("Healthy", { payload: KeyedPayload, success: Schema.String }),
  Rpc.make("Scheduled", { payload: ScheduledPayload, success: Schema.Number })
]).annotateRpcs(ClusterSchema.Persisted, true)
const freshState = () => ({
  counts: new Map<string, number>(),
  completedUninterruptible: 0,
  uninterruptibleEntered: Effect.unsafeMakeLatch(),
  uninterruptibleGate: Effect.unsafeMakeLatch(),
  scheduledDeliveries: [] as Array<number>
})
let state = freshState()
const count = (tag: string, id: string) => state.counts.get(`${tag}:${id}`) ?? 0
const increment = (tag: string, id: string) => state.counts.set(`${tag}:${id}`, count(tag, id) + 1)
const entities = PersistenceEntity.toLayer({
  Healthy: ({ payload }) =>
    Effect.sync(() => {
      increment("Healthy", payload.id)
      return `healthy:${payload.id}`
    }),
  Uninterruptible: Effect.fnUntraced(function*({ payload }) {
    increment("Uninterruptible", payload.id)
    yield* state.uninterruptibleEntered.open
    yield* state.uninterruptibleGate.await
    state.completedUninterruptible++
    return `uninterruptible:${payload.id}`
  }),
  Scheduled: Effect.fnUntraced(function*({ payload }) {
    increment("Scheduled", payload.id)
    const deliveredAt = yield* Clock.currentTimeMillis
    state.scheduledDeliveries.push(deliveredAt)
    return deliveredAt
  })
}, { disableFatalDefects: true })

describe("cluster message persistence integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.scopedLive(`${backend}: does not lose an uninterruptible request during runner shutdown`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, config: { entityTerminationTimeout: 100 }, entities })
        const [owner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity), id = `${backend}-uninterruptible`
        const reply = yield* client("uninterruptible").Uninterruptible(new KeyedPayload({ id })).pipe(Effect.forkScoped)
        yield* cluster.waitUntil(
          "The uninterruptible handler did not start",
          Effect.as(state.uninterruptibleEntered.await, true)
        )
        const stopping = yield* cluster.stop(owner).pipe(Effect.forkScoped)
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The uninterruptible request was not resumed by the replacement runner",
          Effect.sync(() => count("Uninterruptible", id) >= 2)
        )
        yield* state.uninterruptibleGate.open
        yield* cluster.waitUntil(
          "The resumed uninterruptible request did not complete",
          Effect.sync(() => state.completedUninterruptible === 1)
        )
        assert.strictEqual(yield* Fiber.join(reply), `uninterruptible:${id}`)
        yield* Fiber.join(stopping)
        assert.strictEqual(yield* cluster.repliedMessageCount, 1)
      }))
    it.scopedLive(`${backend}: defects a malformed persisted envelope without wedging the mailbox`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities })
        const malformedId = `${backend}-malformed-stored`, entityId = EntityId.make(malformedId)
        const shardId = cluster.clientSharding.getShardId(entityId, PersistenceEntity.getShardGroup(entityId))
        yield* cluster.insertMessage({
          deliver_at: null,
          entity_id: malformedId,
          entity_type: PersistenceEntity.type,
          headers: JSON.stringify({ invalid: 1 }),
          id: "1",
          kind: 0,
          message_id: null,
          payload: JSON.stringify({ id: malformedId }),
          reply_id: null,
          request_id: "1",
          sampled: null,
          shard_id: shardId.toString(),
          span_id: null,
          tag: "Healthy",
          trace_id: null
        })
        yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The malformed persisted envelope was not stored as a defect",
          Effect.map(cluster.failedMessageCount, (count) => count === 1)
        )
        assert.strictEqual(count("Healthy", malformedId), 0)
        const client = yield* cluster.getClient(PersistenceEntity), healthyId = `${backend}-malformed-stored-healthy`
        assert.strictEqual(
          yield* client("malformed-stored-healthy").Healthy(new KeyedPayload({ id: healthyId })),
          `healthy:${healthyId}`
        )
        assert.strictEqual(count("Healthy", healthyId), 1)
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 1, replied: 1, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: delivers scheduled messages only after their deadline`, () =>
      Effect.gen(function*() {
        state = freshState()
        const cluster = yield* make({ backend, entities })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(PersistenceEntity),
          id = `${backend}-scheduled`,
          deliverAt = (yield* Clock.currentTimeMillis) + 1_500
        const reply = yield* client("scheduled").Scheduled(new ScheduledPayload({ deliverAt, id })).pipe(
          Effect.forkScoped
        )
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
          Effect.map(cluster.repliedMessageCount, (count) => count === 1)
        )
        const deliveredAt = yield* Fiber.join(reply)
        assert.isAtLeast(deliveredAt, deliverAt)
        assert.strictEqual(state.scheduledDeliveries[0], deliveredAt)
      }))
  }
})
