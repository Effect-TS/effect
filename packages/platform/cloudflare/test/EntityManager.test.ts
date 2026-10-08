import type { DurableObjectStorage } from "@cloudflare/workers-types"
import { makeEntityKeepAlive } from "@effect/platform-cloudflare/internal/entityKeepAlive"
import { loadNextReply } from "@effect/platform-cloudflare/internal/entityMailbox"
import { registerEntity, unregisterEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import type { EntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { makeEntityManager } from "@effect/platform-cloudflare/internal/entityRuntime"
import { ensureEntityStorage } from "@effect/platform-cloudflare/internal/entityStorage"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import { Context, Effect, type Fiber, Schema, Stream } from "effect"
import { ClusterSchema, Entity, EntityAddress, EntityId, EntityType, ShardId } from "effect/cluster"
import { Rpc, RpcSchema } from "effect/rpc"
import { TestClock } from "effect/testing"
import { DatabaseSync } from "node:sqlite"
import { SqliteStorage } from "./fixtures/sqliteStorage.ts"

const Mailbox = Entity.make("Mailbox", [
  Rpc.make("Watch", {
    success: RpcSchema.Stream(Schema.Number, Schema.Never)
  }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("Add", {
    payload: { operationId: Schema.String },
    primaryKey: ({ operationId }) => operationId,
    success: Schema.Number
  }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("Get", { success: Schema.Number })
])

const counts = new Map<string, number>()
const streamRuns = new Map<string, number>()

const registration: EntityRegistration = {
  entity: Mailbox,
  build: Effect.succeed(Mailbox.of({
    Watch: ({ address }) => {
      streamRuns.set(address.entityId, (streamRuns.get(address.entityId) ?? 0) + 1)
      return Stream.fromIterable([1, 2]).pipe(Stream.rechunk(1))
    },
    Add: ({ address }) =>
      Effect.sync(() => {
        const value = (counts.get(address.entityId) ?? 0) + 1
        counts.set(address.entityId, value)
        return value
      }),
    Get: ({ address }) => Effect.sync(() => counts.get(address.entityId) ?? 0)
  })),
  options: undefined,
  context: Context.empty()
}

// it.effect runs on the TestClock; this waits on the real event loop.
const settle = Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 10)))

let requestCount = 0
const nextRequestId = () => `0198bd72-6a80-72f1-8d87-${String(requestCount++).padStart(12, "0")}`

const makeMailbox = Effect.fnUntraced(function*(entityId: string) {
  const database = yield* Effect.acquireRelease(
    Effect.sync(() => new DatabaseSync(":memory:")),
    (database) => Effect.sync(() => database.close())
  )
  const storage = new SqliteStorage(database)
  ensureEntityStorage(storage.sql)
  const address = EntityAddress.make({
    shardId: ShardId.make("default", 1),
    entityType: EntityType.make(Mailbox.type),
    entityId: EntityId.make(entityId)
  })
  const waitUntilFibers: Array<Fiber.Fiber<unknown>> = []
  const manager = makeEntityManager({
    storage: storage as unknown as DurableObjectStorage,
    address,
    entityName: `${Mailbox.type.length}:${Mailbox.type}${entityId}`,
    keepAlive: makeEntityKeepAlive({
      startHold: () => Promise.resolve(),
      wanted: false,
      persist: () => Effect.void,
      retryCapMillis: () => 0
    }),
    waitUntil: (effect) => {
      waitUntilFibers.push(Effect.runFork(effect))
    },
    getNamespace: () => undefined
  })
  const envelope = (tag: "Watch" | "Add" | "Get", payload: unknown = null, requestId = nextRequestId()) =>
    JSON.stringify({ _tag: "Request", requestId, address, tag, payload, headers: {} })
  const exitOf = (reply: string) => JSON.parse(reply).exit
  return { storage, manager, envelope, exitOf, waitUntilFibers }
})

describe("EntityManager", () => {
  beforeAll(() => {
    assert.isTrue(registerEntity(Mailbox.type, registration))
  })
  afterAll(() => {
    unregisterEntity(Mailbox.type, registration)
  })

  it.effect("completes an interrupted persisted stream instead of replaying it", () =>
    Effect.gen(function*() {
      const { envelope, manager, storage, waitUntilFibers } = yield* makeMailbox("interrupted")
      const streamRequestId = nextRequestId()
      const first = yield* manager.invoke(envelope("Watch", null, streamRequestId), false)
      assert.strictEqual(first._tag === "Success" ? JSON.parse(first.replies[0])._tag : first._tag, "Chunk")

      yield* manager.interrupt(streamRequestId)
      const get = yield* manager.invoke(envelope("Get"), false)
      yield* Effect.yieldNow

      assert.strictEqual(get._tag, "Success")
      assert.strictEqual(streamRuns.get("interrupted"), 1)
      assert.isTrue(waitUntilFibers.every((fiber) => fiber.pollUnsafe() !== undefined))
      assert.strictEqual((yield* loadNextReply(storage.sql, streamRequestId))?.kind, "WithExit")
    }))

  it.effect("serves other requests while a stream chunk awaits acknowledgement", () =>
    Effect.gen(function*() {
      const { envelope, exitOf, manager } = yield* makeMailbox("unacked")
      const streamRequestId = nextRequestId()
      const first = yield* manager.invoke(envelope("Watch", null, streamRequestId), false)
      assert(first._tag === "Success")
      const chunk = JSON.parse(first.replies[0])
      assert.strictEqual(chunk._tag, "Chunk")

      // The default concurrency is 1, so a stream holding its permit while
      // parked on the acknowledgement would block this request.
      const get = yield* manager.invoke(envelope("Get"), false).pipe(Effect.timeout("1 second"), TestClock.withLive)
      assert(get._tag === "Success")
      assert.deepStrictEqual(exitOf(get.replies[0]), { _tag: "Success", value: 0 })

      const next = yield* manager.acknowledge(streamRequestId, chunk.id)
      assert.deepStrictEqual(JSON.parse(next[0]).values, [2])
    }))

  it.effect("skips an undecodable replay row and keeps serving requests", () =>
    Effect.gen(function*() {
      const { envelope, exitOf, manager, storage } = yield* makeMailbox("poisoned")
      storage.sql.exec(
        "INSERT INTO cluster_messages (request_id, envelope) VALUES (?, ?)",
        "poison",
        envelope("Add", { operationId: 123 }, "poison")
      )

      const get = yield* manager.invoke(envelope("Get"), false)
      assert(get._tag === "Success")
      assert.deepStrictEqual(exitOf(get.replies[0]), { _tag: "Success", value: 0 })
    }))

  it.effect("rejects an ask deduplicated onto a pending tell without running the tell", () =>
    Effect.gen(function*() {
      const { envelope, exitOf, manager } = yield* makeMailbox("ask-to-tell")
      const delivery = { deliverAt: Date.now() + 60_000, primaryKey: "Mailbox/ask-to-tell/Add/same" }
      yield* manager.invoke(envelope("Add", { operationId: "same" }), true, delivery)

      const ask = yield* manager.invoke(envelope("Add", { operationId: "same" }), false, delivery)
      assert.strictEqual(ask._tag, "AskDeduplicatedToTell")

      const get = yield* manager.invoke(envelope("Get"), false)
      assert(get._tag === "Success")
      assert.deepStrictEqual(exitOf(get.replies[0]), { _tag: "Success", value: 0 })
    }))

  it.effect("interrupts only the matching waiter of a deduplicated delayed ask", () =>
    Effect.gen(function*() {
      const { envelope, manager } = yield* makeMailbox("waiters")
      const delivery = { deliverAt: Date.now() + 60_000, primaryKey: "Mailbox/waiters/Add/same" }
      const firstRequestId = nextRequestId()
      const secondRequestId = nextRequestId()
      const first = yield* Effect.forkChild(
        manager.invoke(envelope("Add", { operationId: "same" }, firstRequestId), false, delivery)
      )
      const second = yield* Effect.forkChild(
        manager.invoke(envelope("Add", { operationId: "same" }, secondRequestId), false, delivery)
      )
      // The duplicate waits on the original row, so it is interrupted through
      // the original's storage id and its own client id. Interrupting a waiter
      // that has not registered yet is a no-op, so retry until it ends.
      yield* Effect.gen(function*() {
        while (second.pollUnsafe() === undefined) {
          yield* manager.interrupt(firstRequestId, secondRequestId)
          yield* settle
        }
      }).pipe(Effect.timeout("2 seconds"), TestClock.withLive)
      yield* settle

      assert.isUndefined(first.pollUnsafe(), "Interrupting the duplicate also ended the original waiter")
      yield* manager.interrupt(firstRequestId)
    }))
})
