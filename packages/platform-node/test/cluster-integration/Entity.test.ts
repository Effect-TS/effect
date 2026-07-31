import { assert, describe, it } from "@effect/vitest"
import { Clock, Effect, Fiber, Latch, Layer, PrimaryKey, Schema, Scope } from "effect"
import { ClusterSchema, Entity, EntityResource, Singleton } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"
import { type Backend, type ClusterRunner, make } from "./harness.ts"

class Request extends Schema.Class<Request>("ClusterEntityRequest")({
  id: Schema.String,
  sequence: Schema.Number
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const StateReply = Schema.Struct({
  generation: Schema.Number,
  runner: Schema.String,
  value: Schema.Number
})

const StateEntity = Entity.make("ClusterIntegrationState", [
  Rpc.make("Increment", {
    payload: Request,
    success: StateReply
  }),
  Rpc.make("Ordered", {
    payload: Request,
    success: Schema.Number
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

let orderGate = Latch.makeUnsafe(true)
let orderEntered = Latch.makeUnsafe()
let order: Array<number> = []
const generations = new Map<string, number>()

const addressString = (address: { readonly host: string; readonly port: number }) => `${address.host}:${address.port}`

const StateEntityLayer = StateEntity.toLayer(
  Effect.gen(function*() {
    const address = yield* Entity.CurrentAddress
    const runner = yield* Entity.CurrentRunnerAddress
    const entityId = String(address.entityId)
    const generation = (generations.get(entityId) ?? 0) + 1
    generations.set(entityId, generation)
    let value = 0
    return {
      Increment: () =>
        Effect.sync(() => ({
          generation,
          runner: addressString(runner),
          value: ++value
        })),
      Ordered: Effect.fnUntraced(function*({ payload }) {
        order.push(payload.sequence)
        if (payload.sequence === 1) {
          orderEntered.openUnsafe()
          yield* orderGate.await
        }
        return payload.sequence
      })
    }
  }),
  { maxIdleTime: "1 second" }
)

const MailboxEntity = Entity.make("ClusterIntegrationMailbox", [
  Rpc.make("Hold", {
    payload: Request,
    success: Schema.Number
  })
])

let mailboxGate = Latch.makeUnsafe(true)
let mailboxEntered = Latch.makeUnsafe()

const MailboxEntityLayer = MailboxEntity.toLayer({
  Hold: Effect.fnUntraced(function*({ payload }) {
    mailboxEntered.openUnsafe()
    yield* mailboxGate.await
    return payload.sequence
  })
}, { mailboxCapacity: 1 })

const GroupEntity = Entity.make("ClusterIntegrationSpecialGroup", [
  Rpc.make("Runner", { success: Schema.String })
]).annotate(ClusterSchema.ShardGroup, () => "special")

const GroupEntityLayer = GroupEntity.toLayer(Effect.gen(function*() {
  const runner = yield* Entity.CurrentRunnerAddress
  return { Runner: () => Effect.succeed(addressString(runner)) }
}))

const ResourceEntity = Entity.make("ClusterIntegrationResource", [
  Rpc.make("Get", { success: Schema.Number }),
  Rpc.make("Close", { success: Schema.Void })
])

const resourceState = { acquired: 0, released: 0 }

const ResourceEntityLayer = ResourceEntity.toLayer(Effect.gen(function*() {
  const resource = yield* EntityResource.make({
    acquire: Effect.gen(function*() {
      const closeScope = yield* EntityResource.CloseScope
      return yield* Effect.acquireRelease(
        Effect.sync(() => ++resourceState.acquired),
        () => Effect.sync(() => resourceState.released++)
      ).pipe(Scope.provide(closeScope))
    })
  })
  return {
    Close: () => resource.close,
    Get: () => Effect.scoped(resource.get)
  }
}))

const StandardEntities = Layer.mergeAll(StateEntityLayer, MailboxEntityLayer, ResourceEntityLayer)

const resetOrder = () => {
  orderGate = Latch.makeUnsafe()
  orderEntered = Latch.makeUnsafe()
  order = []
}

const resetMailbox = () => {
  mailboxGate = Latch.makeUnsafe()
  mailboxEntered = Latch.makeUnsafe()
}

const findIdsByRunner = Effect.fnUntraced(function*(
  cluster: Effect.Success<ReturnType<typeof make>>,
  runners: ReadonlyArray<ClusterRunner>
) {
  const found = new Map<ClusterRunner, string>()
  for (let index = 0; index < 2_000 && found.size < runners.length; index++) {
    const id = `entity-${index}`
    const owner = yield* cluster.ownerOfEntity(StateEntity, id)
    if (owner && runners.includes(owner) && !found.has(owner)) found.set(owner, id)
  }
  assert.strictEqual(found.size, runners.length)
  return found
})

describe("cluster entity integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.live(`${backend}: routes by entity id, isolates state, and preserves mailbox order`, () =>
      Effect.gen(function*() {
        generations.clear()
        resetOrder()
        const cluster = yield* make({ backend, entities: StandardEntities })
        const runners = yield* cluster.start(3)
        yield* cluster.waitForStableAssignments()
        const ids = yield* findIdsByRunner(cluster, runners)
        const client = yield* cluster.getClient(StateEntity)

        for (const [runner, id] of ids) {
          const first = yield* client(id).Increment(new Request({ id: `${id}-1`, sequence: 0 }))
          const second = yield* client(id).Increment(new Request({ id: `${id}-2`, sequence: 0 }))
          assert.strictEqual(first.runner, addressString(runner.address))
          assert.strictEqual(second.runner, first.runner)
          assert.strictEqual(first.value, 1)
          assert.strictEqual(second.value, 2)
          assert.isFalse(cluster.clientSharding.hasShardId(yield* cluster.shardOfEntity(StateEntity, id)))
        }

        const orderedId = ids.values().next().value!
        const first = yield* client(orderedId).Ordered(
          new Request({ id: `${backend}-ordered-1`, sequence: 1 })
        ).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil("The first ordered request did not start", Effect.as(orderEntered.await, true))
        const second = yield* client(orderedId).Ordered(
          new Request({ id: `${backend}-ordered-2`, sequence: 2 })
        ).pipe(Effect.forkChild({ startImmediately: true }))
        orderGate.openUnsafe()
        assert.strictEqual(yield* Fiber.join(first), 1)
        assert.strictEqual(yield* Fiber.join(second), 2)
        assert.deepStrictEqual(order, [1, 2])

        const registrations = (yield* cluster.diagnostics()).registrations
        assert.strictEqual(registrations.length, runners.length)
      }))

    it.live(`${backend}: reports mailbox saturation and revives idle entities with fresh state`, () =>
      Effect.gen(function*() {
        generations.clear()
        resetMailbox()
        const cluster = yield* make({ backend, entities: StandardEntities })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()

        const mailbox = yield* cluster.getClient(MailboxEntity)
        const held = yield* mailbox("full").Hold(
          new Request({ id: `${backend}-held`, sequence: 1 })
        ).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil("The mailbox request did not start", Effect.as(mailboxEntered.await, true))
        const error = yield* mailbox("full").Hold(
          new Request({ id: `${backend}-rejected`, sequence: 2 })
        ).pipe(Effect.flip)
        assert.strictEqual(error._tag, "MailboxFull")
        mailboxGate.openUnsafe()
        assert.strictEqual(yield* Fiber.join(held), 1)

        const state = yield* cluster.getClient(StateEntity)
        const first = yield* state("idle").Increment(
          new Request({ id: `${backend}-idle-1`, sequence: 0 })
        )
        const owner = yield* cluster.ownerOfEntity(StateEntity, "idle")
        yield* cluster.waitUntil(
          "The idle entity was not reaped",
          Effect.map(owner!.sharding.activeEntityCount, (count) => count === 0),
          "12 seconds"
        )
        const revived = yield* state("idle").Increment(
          new Request({ id: `${backend}-idle-2`, sequence: 0 })
        )
        assert.strictEqual(first.generation, 1)
        assert.strictEqual(revived.generation, 2)
        assert.strictEqual(revived.value, 1)
      }))

    it.live(`${backend}: rebalances on runner addition, graceful stop, and abrupt death`, () =>
      Effect.gen(function*() {
        resetOrder()
        const cluster = yield* make({ backend, entities: StandardEntities })
        const initial = yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const before = new Map<string, ClusterRunner>()
        for (let index = 0; index < 2_000; index++) {
          const id = `moving-${index}`
          before.set(id, (yield* cluster.ownerOfEntity(StateEntity, id))!)
        }

        const [added] = yield* cluster.start(1)
        assert.strictEqual(added.index, 2)
        yield* cluster.waitForStableAssignments()
        let movedId: string | undefined
        for (const [id, old] of before) {
          if (old !== added && (yield* cluster.ownerOfEntity(StateEntity, id)) === added) {
            movedId = id
            break
          }
        }
        assert.isDefined(movedId)
        const client = yield* cluster.getClient(StateEntity)
        const moved = yield* client(movedId!).Increment(
          new Request({ id: `${backend}-moved`, sequence: 0 })
        )
        assert.strictEqual(moved.runner, addressString(added.address))

        const stopId = (yield* findIdsByRunner(cluster, initial)).get(initial[0])!
        const request = yield* client(stopId).Ordered(
          new Request({ id: `${backend}-stop`, sequence: 1 })
        ).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil("The handover request did not start", Effect.as(orderEntered.await, true))
        const stopping = yield* cluster.stop(initial[0]).pipe(Effect.forkChild({ startImmediately: true }))
        yield* cluster.waitUntil(
          "The stopped runner did not hand over its entity",
          Effect.map(cluster.ownerOfEntity(StateEntity, stopId), (owner) => owner !== undefined && owner !== initial[0])
        )
        orderGate.openUnsafe()
        assert.strictEqual(yield* Fiber.join(request), 1)
        yield* Fiber.join(stopping)

        const killId = `kill-${backend}`
        const killed = yield* cluster.ownerOfEntity(StateEntity, killId)
        yield* cluster.kill(killed!)
        const reply = yield* client(killId).Increment(
          new Request({ id: `${backend}-kill`, sequence: 0 })
        )
        assert.notStrictEqual(reply.runner, addressString(killed!.address))
        yield* cluster.waitForStableAssignments()
        assert.strictEqual((yield* cluster.messageCounts()).unprocessed, 0)
      }))

    it.live(`${backend}: transfers frozen row locks after expiry`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: StandardEntities, lockMode: "row" })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const id = `frozen-${backend}`
        const oldOwner = yield* cluster.ownerOfEntity(StateEntity, id)
        const shard = yield* cluster.shardOfEntity(StateEntity, id)
        yield* cluster.freeze(oldOwner!)
        yield* cluster.waitUntil(
          "The frozen runner's row lock did not expire",
          Effect.map(cluster.ownerOfEntity(StateEntity, id), (owner) => owner !== undefined && owner !== oldOwner),
          "12 seconds"
        )
        const nextOwner = yield* cluster.ownerOfEntity(StateEntity, id)
        assert.strictEqual(cluster.ownersOfShard(shard).length, 1)
        assert.strictEqual(cluster.ownersOfShard(shard)[0], nextOwner)
        const client = yield* cluster.getClient(StateEntity)
        const reply = yield* client(id).Increment(new Request({ id: `${backend}-freeze`, sequence: 0 }))
        assert.strictEqual(reply.runner, addressString(nextOwner!.address))
        yield* cluster.kill(oldOwner!)
      }))

    it.live(`${backend}: retains frozen advisory locks until the session closes`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: StandardEntities })
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const id = `frozen-advisory-${backend}`
        const oldOwner = yield* cluster.ownerOfEntity(StateEntity, id)
        const shard = yield* cluster.shardOfEntity(StateEntity, id)
        yield* cluster.freeze(oldOwner!)
        const deadline = (yield* Clock.currentTimeMillis) + 3_000
        yield* cluster.waitUntil(
          "The advisory-lock observation window did not elapse",
          Effect.map(Clock.currentTimeMillis, (now) => now >= deadline),
          "5 seconds"
        )
        assert.strictEqual(cluster.ownersOfShard(shard).length, 0)
        assert.deepStrictEqual(cluster.ownersOfShard(shard, true), [oldOwner])
        yield* cluster.kill(oldOwner!)
        yield* cluster.waitUntil(
          "The advisory lock was not handed over after its session closed",
          Effect.map(cluster.ownerOfEntity(StateEntity, id), (owner) => owner !== undefined && owner !== oldOwner)
        )
      }))
  }

  it.live("assigns annotated entities only to runners in their shard group", () =>
    Effect.gen(function*() {
      const entities = Layer.mergeAll(StateEntityLayer, GroupEntityLayer)
      const cluster = yield* make({
        backend: "pg",
        config: { availableShardGroups: ["default", "special"], shardsPerGroup: 30 },
        entities
      })
      const [defaultRunner] = yield* cluster.start(1, { assignedShardGroups: ["default"] })
      const [specialRunner] = yield* cluster.start(1, { assignedShardGroups: ["special"] })
      yield* cluster.waitForStableAssignments()
      const client = yield* cluster.getClient(GroupEntity)
      assert.strictEqual(yield* client("grouped").Runner(), addressString(specialRunner.address))
      assert.strictEqual(yield* cluster.ownerOfEntity(GroupEntity, "grouped"), specialRunner)
      assert.strictEqual(yield* cluster.ownerOfEntity(StateEntity, "default"), defaultRunner)
    }))

  it.live("runs one singleton and migrates it after owner death", () =>
    Effect.gen(function*() {
      const singleton = { active: 0, maxActive: 0, starts: 0 }
      const singletonLayer = Singleton.make(
        "cluster-integration-singleton",
        Effect.acquireRelease(
          Effect.sync(() => {
            singleton.active++
            singleton.starts++
            singleton.maxActive = Math.max(singleton.maxActive, singleton.active)
          }),
          () => Effect.sync(() => singleton.active--)
        )
      )
      const cluster = yield* make({
        backend: "pg",
        entities: Layer.merge(StateEntityLayer, singletonLayer)
      })
      const runners = yield* cluster.start(3)
      yield* cluster.waitForStableAssignments()
      yield* cluster.waitUntil("The singleton did not start", Effect.sync(() => singleton.active === 1))
      const firstOwner = yield* cluster.ownerOfEntity(StateEntity, "cluster-integration-singleton")
      assert.isTrue(runners.includes(firstOwner!))
      yield* cluster.kill(firstOwner!)
      yield* cluster.waitUntil(
        "The singleton did not migrate",
        Effect.sync(() => singleton.starts >= 2 && singleton.active === 1)
      )
      assert.notStrictEqual(
        yield* cluster.ownerOfEntity(StateEntity, "cluster-integration-singleton"),
        firstOwner
      )
      assert.strictEqual(singleton.maxActive, 1)
    }))

  it.live("keeps EntityResource alive during movement and releases it explicitly", () =>
    Effect.gen(function*() {
      resourceState.acquired = 0
      resourceState.released = 0
      const cluster = yield* make({ backend: "pg", entities: ResourceEntityLayer })
      yield* cluster.start(2)
      yield* cluster.waitForStableAssignments()
      const client = yield* cluster.getClient(ResourceEntity)
      assert.strictEqual(yield* client("resource").Get(), 1)
      const owner = yield* cluster.ownerOfEntity(ResourceEntity, "resource")
      yield* cluster.stop(owner!)
      yield* cluster.waitUntil(
        "The resource entity did not move",
        Effect.map(cluster.ownerOfEntity(ResourceEntity, "resource"), (next) => next !== undefined && next !== owner)
      )
      assert.strictEqual(resourceState.released, 0)
      assert.strictEqual(yield* client("resource").Get(), 2)
      yield* client("resource").Close()
      yield* cluster.waitUntil(
        "The entity resource was not released",
        Effect.sync(() => resourceState.released === 1)
      )
    }))

  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.live(`${backend}: isolates clusters with different table prefixes`, () =>
      Effect.gen(function*() {
        const first = yield* make({ backend, entities: StateEntityLayer, config: { shardsPerGroup: 30 } })
        const second = yield* make({ backend, entities: StateEntityLayer, config: { shardsPerGroup: 30 } })
        const [firstRunner] = yield* first.start(1)
        const [secondRunner] = yield* second.start(1)
        yield* first.waitForStableAssignments()
        yield* second.waitForStableAssignments()
        assert.notStrictEqual(first.prefix, second.prefix)
        const firstRegistrations = (yield* first.diagnostics()).registrations
        const secondRegistrations = (yield* second.diagnostics()).registrations
        assert.deepStrictEqual(firstRegistrations.map((row) => row.address), [addressString(firstRunner.address)])
        assert.deepStrictEqual(secondRegistrations.map((row) => row.address), [addressString(secondRunner.address)])
        const firstClient = yield* first.getClient(StateEntity)
        const secondClient = yield* second.getClient(StateEntity)
        const firstReply = yield* firstClient("same-id").Increment(
          new Request({ id: `${backend}-prefix-first`, sequence: 0 })
        )
        const secondReply = yield* secondClient("same-id").Increment(
          new Request({ id: `${backend}-prefix-second`, sequence: 0 })
        )
        assert.strictEqual(firstReply.runner, addressString(firstRunner.address))
        assert.strictEqual(secondReply.runner, addressString(secondRunner.address))
      }))
  }
})
