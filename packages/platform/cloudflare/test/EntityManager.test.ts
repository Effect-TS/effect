import type { DurableObjectStorage } from "@cloudflare/workers-types"
import { makeEntityKeepAlive } from "@effect/platform-cloudflare/internal/entityKeepAlive"
import { loadNextReply } from "@effect/platform-cloudflare/internal/entityMailbox"
import { registerEntity, unregisterEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import type { EntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { makeEntityManager } from "@effect/platform-cloudflare/internal/entityRuntime"
import type { EntityManagerOptions } from "@effect/platform-cloudflare/internal/entityRuntime"
import { ensureEntityStorage } from "@effect/platform-cloudflare/internal/entityStorage"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Fiber, Schema, Stream } from "effect"
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
  keepAliveHeartbeat: 30_000,
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

const makeMailbox = Effect.fnUntraced(function*(
  entityId: string,
  entityType = Mailbox.type,
  getNamespace: EntityManagerOptions["getNamespace"] = () => undefined
) {
  const database = yield* Effect.acquireRelease(
    Effect.sync(() => new DatabaseSync(":memory:")),
    (database) => Effect.sync(() => database.close())
  )
  const storage = new SqliteStorage(database)
  ensureEntityStorage(storage.sql)
  const address = EntityAddress.make({
    shardId: ShardId.make("default", 1),
    entityType: EntityType.make(entityType),
    entityId: EntityId.make(entityId)
  })
  const waitUntilFibers: Array<Fiber.Fiber<unknown>> = []
  const restart = () =>
    makeEntityManager({
      storage: storage as unknown as DurableObjectStorage,
      address,
      entityName: `${entityType.length}:${entityType}${entityId}`,
      keepAlive: makeEntityKeepAlive({
        startHold: () => Promise.resolve(),
        wanted: false,
        persist: () => Effect.void,
        retryCapMillis: () => 0
      }),
      waitUntil: (effect) => {
        waitUntilFibers.push(Effect.runFork(effect))
      },
      getNamespace
    })
  const envelope = (tag: string, payload: unknown = null, requestId = nextRequestId()) =>
    JSON.stringify({ _tag: "Request", requestId, address, tag, payload, headers: {} })
  const exitOf = (reply: string) => JSON.parse(reply).exit
  return { storage, manager: restart(), restart, envelope, exitOf, waitUntilFibers }
})

// A persisted ask whose handler blocks until released, so a duplicate can
// arrive while its scheduled execution is running.
const makeGatedAsk = Effect.fnUntraced(function*(name: string) {
  const started = yield* Deferred.make<void>()
  const release = yield* Deferred.make<void>()
  const state = { runs: 0 }
  const entity = Entity.make(name, [
    Rpc.make("Add", {
      payload: { operationId: Schema.String },
      primaryKey: ({ operationId }) => operationId,
      success: Schema.Number
    }).annotate(ClusterSchema.Persisted, true)
  ])
  const handlers: EntityRegistration = {
    entity,
    keepAliveHeartbeat: 30_000,
    build: Effect.succeed(entity.of({
      Add: Effect.fnUntraced(function*() {
        const run = ++state.runs
        yield* Deferred.succeed(started, undefined)
        yield* Deferred.await(release)
        return run
      })
    })),
    options: undefined,
    context: Context.empty()
  }
  yield* Effect.acquireRelease(
    Effect.sync(() => registerEntity(entity.type, handlers)),
    () => Effect.sync(() => unregisterEntity(entity.type, handlers))
  )
  return { entity, started, release, state }
})

// Waits on the real clock until a just-scheduled deadline has passed.
const pastDeadline = Effect.sleep("50 millis").pipe(TestClock.withLive)

describe("EntityManager", () => {
  beforeAll(() => {
    assert.isTrue(registerEntity(Mailbox.type, registration))
  })
  afterAll(() => {
    unregisterEntity(Mailbox.type, registration)
  })

  for (const outcome of ["success", "failure"] as const) {
    it.effect(`shares an active unary ${outcome} with concurrent primary-key duplicates`, () =>
      Effect.gen(function*() {
        const started = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        let runs = 0
        const entity = Entity.make(`DuplicateUnary-${outcome}`, [
          Rpc.make("Add", {
            payload: { operationId: Schema.String },
            primaryKey: ({ operationId }) => operationId,
            success: Schema.Number,
            error: Schema.String
          }).annotate(ClusterSchema.Persisted, true)
        ])
        const handlers: EntityRegistration = {
          entity,
          keepAliveHeartbeat: 30_000,
          build: Effect.succeed(entity.of({
            Add: Effect.fnUntraced(function*() {
              runs++
              yield* Deferred.succeed(started, undefined)
              yield* Deferred.await(release)
              return yield* outcome === "failure" ? Effect.fail("rejected") : Effect.succeed(42)
            })
          })),
          options: undefined,
          context: Context.empty()
        }
        yield* Effect.acquireRelease(
          Effect.sync(() => registerEntity(entity.type, handlers)),
          () => Effect.sync(() => unregisterEntity(entity.type, handlers))
        )
        const { envelope, exitOf, manager } = yield* makeMailbox("duplicates", entity.type)
        const first = yield* Effect.forkChild(manager.invoke(envelope("Add", { operationId: "same" }), false))
        yield* Deferred.await(started)
        const duplicate = yield* Effect.forkChild(manager.invoke(envelope("Add", { operationId: "same" }), false))
        yield* settle
        yield* Deferred.succeed(release, undefined)
        const original = yield* Fiber.join(first)
        assert(original._tag === "Success")
        assert.strictEqual(original.replies.length, 1)
        assert.strictEqual(exitOf(original.replies[0])._tag, outcome === "failure" ? "Failure" : "Success")
        assert.deepStrictEqual(yield* Fiber.join(duplicate), original)
        assert.strictEqual(runs, 1)
      }))
  }

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

  for (const window of ["handler finalization", "terminal reply persistence"] as const) {
    it.effect(
      `does not replay cancellation during ${window} or after restart`,
      () =>
        Effect.gen(function*() {
          const finalizing = yield* Deferred.make<void>()
          const releaseFinalizer = yield* Deferred.make<void>()
          const settlingAlarm = yield* Deferred.make<void>()
          const releaseAlarm = yield* Deferred.make<void>()
          let runs = 0
          const entity = Entity.make(`CancellingMailbox-${window}`, [
            Rpc.make("Watch", {
              success: RpcSchema.Stream(Schema.Number, Schema.Never)
            }).annotate(ClusterSchema.Persisted, true)
          ])
          const handlers: EntityRegistration = {
            entity,
            keepAliveHeartbeat: 30_000,
            build: Effect.succeed(entity.of({
              Watch: () => {
                runs++
                // A replay finishes immediately so a regression cannot leave
                // another detached stream waiting for acknowledgement.
                if (runs > 1) return Stream.empty
                return Stream.make(1).pipe(
                  Stream.concat(Stream.never),
                  Stream.ensuring(Effect.andThen(
                    Deferred.succeed(finalizing, undefined),
                    Deferred.await(releaseFinalizer)
                  ))
                )
              }
            })),
            options: undefined,
            context: Context.empty()
          }
          yield* Effect.acquireRelease(
            Effect.sync(() => assert.isTrue(registerEntity(entity.type, handlers))),
            () => Effect.sync(() => unregisterEntity(entity.type, handlers))
          )
          const { envelope, manager, restart, storage } = yield* makeMailbox(window, entity.type)
          const requestId = nextRequestId()
          const first = yield* manager.invoke(envelope("Watch", null, requestId), false)
          assert.strictEqual(first._tag === "Success" ? JSON.parse(first.replies[0])._tag : first._tag, "Chunk")
          const heartbeat = storage.alarm!
          let cleanupDeadline: number | undefined

          const cancelling = yield* Effect.forkChild(manager.interrupt(requestId))
          yield* Deferred.await(finalizing)
          const getAlarm = storage.getAlarm.bind(storage)
          let gated = false
          storage.getAlarm = () => {
            if (gated) return getAlarm()
            gated = true
            Deferred.doneUnsafe(settlingAlarm, Effect.void)
            return Effect.runPromise(Effect.andThen(
              Deferred.await(releaseAlarm),
              Effect.promise(getAlarm)
            ))
          }
          if (window === "handler finalization") {
            // The original handler is still inside its interruption finalizer.
            const alarm = yield* Effect.forkChild(manager.alarm)
            yield* Deferred.await(settlingAlarm)
            yield* Deferred.succeed(releaseAlarm, undefined)
            yield* Deferred.succeed(releaseFinalizer, undefined)
            yield* Fiber.join(alarm)
          } else {
            const setAlarm = storage.setAlarm.bind(storage)
            storage.setAlarm = (deadline) => {
              cleanupDeadline ??= deadline
              return setAlarm(deadline)
            }
            yield* Deferred.succeed(releaseFinalizer, undefined)
            yield* Deferred.await(settlingAlarm)
            // The handler has ended, but its durable reply is still a chunk.
            assert.strictEqual((yield* loadNextReply(storage.sql, requestId))?.kind, "Chunk")
            // Race an alarm against the terminal write once cleanup releases
            // the entry permit. Cleanup must not arm immediate replay meanwhile.
            const alarm = yield* Effect.forkChild(manager.alarm, { startImmediately: true })
            yield* Deferred.succeed(releaseAlarm, undefined)
            yield* Fiber.join(alarm)
          }
          yield* Fiber.join(cancelling)
          const reply = yield* loadNextReply(storage.sql, requestId)
          assert.strictEqual(reply?.kind, "WithExit")
          assert.strictEqual(JSON.parse(reply!.reply).exit._tag, "Failure")

          // A fresh manager shares durable storage, but none of the old sessions.
          yield* restart().alarm
          assert.strictEqual(storage.alarm, null)
          assert.strictEqual(runs, 1, "Cancellation allowed the persisted handler to execute again")
          if (window === "terminal reply persistence" && cleanupDeadline !== undefined) {
            assert.isAtLeast(
              cleanupDeadline,
              heartbeat,
              "Cleanup armed replay before the interruption reply was durable"
            )
          }
        })
    )
  }

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

  it.effect("runs an Rpc.fork handler while another handler holds the only permit", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const entity = Entity.make("ForkMailbox", [
        Rpc.make("Hold", { success: Schema.String }),
        Rpc.make("Forked", { success: Schema.String })
      ])
      const handlers: EntityRegistration = {
        entity,
        keepAliveHeartbeat: 30_000,
        build: Effect.succeed(entity.of({
          Hold: () => Effect.andThen(Deferred.succeed(started, undefined), Effect.as(Deferred.await(release), "held")),
          Forked: () => Rpc.fork(Effect.succeed("forked"))
        })),
        options: { concurrency: 1 },
        context: Context.empty()
      }
      yield* Effect.acquireRelease(
        Effect.sync(() => registerEntity(entity.type, handlers)),
        () => Effect.sync(() => unregisterEntity(entity.type, handlers))
      )
      const { envelope, exitOf, manager } = yield* makeMailbox("fork", entity.type)
      const hold = yield* Effect.forkChild(manager.invoke(envelope("Hold"), false))
      yield* Deferred.await(started)

      const forked = yield* manager.invoke(envelope("Forked"), false).pipe(
        Effect.timeout("1 second"),
        TestClock.withLive
      )
      assert(forked._tag === "Success")
      assert.deepStrictEqual(exitOf(forked.replies[0]), { _tag: "Success", value: "forked" })

      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(hold)
    }))

  it.effect("interrupts a request waiting for the only permit", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      let queuedRuns = 0
      const entity = Entity.make("QueuedMailbox", [
        Rpc.make("Hold", { success: Schema.String }),
        Rpc.make("Queued", { success: Schema.String })
      ])
      const handlers: EntityRegistration = {
        entity,
        keepAliveHeartbeat: 30_000,
        build: Effect.succeed(entity.of({
          Hold: () => Effect.andThen(Deferred.succeed(started, undefined), Effect.as(Deferred.await(release), "held")),
          Queued: () =>
            Effect.sync(() => {
              queuedRuns++
              return "queued"
            })
        })),
        options: { concurrency: 1 },
        context: Context.empty()
      }
      yield* Effect.acquireRelease(
        Effect.sync(() => registerEntity(entity.type, handlers)),
        () => Effect.sync(() => unregisterEntity(entity.type, handlers))
      )
      const { envelope, manager } = yield* makeMailbox("queued", entity.type)
      const hold = yield* Effect.forkChild(manager.invoke(envelope("Hold"), false))
      yield* Deferred.await(started)
      const queuedRequestId = nextRequestId()
      const queued = yield* Effect.forkChild(manager.invoke(envelope("Queued", null, queuedRequestId), false))
      yield* settle

      yield* manager.interrupt(queuedRequestId).pipe(Effect.timeout("1 second"), TestClock.withLive)
      yield* Fiber.join(queued)

      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(hold)
      assert.strictEqual(queuedRuns, 0)
    }))

  it.effect("lets an Rpc.uninterruptible handler finish after an interrupt", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      let completed = false
      const entity = Entity.make("UninterruptibleMailbox", [
        Rpc.make("Critical", { success: Schema.String }).annotate(ClusterSchema.Persisted, true)
      ])
      const handlers: EntityRegistration = {
        entity,
        keepAliveHeartbeat: 30_000,
        build: Effect.succeed(entity.of({
          Critical: () =>
            Rpc.uninterruptible(Effect.gen(function*() {
              yield* Deferred.succeed(started, undefined)
              yield* Deferred.await(release)
              completed = true
              return "done"
            }))
        })),
        options: undefined,
        context: Context.empty()
      }
      yield* Effect.acquireRelease(
        Effect.sync(() => registerEntity(entity.type, handlers)),
        () => Effect.sync(() => unregisterEntity(entity.type, handlers))
      )
      const { envelope, exitOf, manager, storage } = yield* makeMailbox("uninterruptible", entity.type)
      const requestId = nextRequestId()
      const invoke = yield* Effect.forkChild(manager.invoke(envelope("Critical", null, requestId), false))
      yield* Deferred.await(started)

      const interrupt = yield* Effect.forkChild(manager.interrupt(requestId))
      yield* settle
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(interrupt)
      yield* Fiber.join(invoke)

      assert.isTrue(completed)
      // The handler's late success must not replace the interrupt reply.
      const reply = yield* loadNextReply(storage.sql, requestId)
      assert.strictEqual(exitOf(reply!.reply)._tag, "Failure")
    }))

  it.effect("resumes a running scheduled ask for a duplicate sent after its deadline", () =>
    Effect.gen(function*() {
      const { entity, release, started, state } = yield* makeGatedAsk("ScheduledDuplicate")
      const { envelope, exitOf, manager } = yield* makeMailbox("late", entity.type)
      const delivery = { deliverAt: Date.now() + 20, primaryKey: `${entity.type}/late/Add/same` }
      const first = yield* Effect.forkChild(manager.invoke(envelope("Add", { operationId: "same" }), false, delivery))
      yield* pastDeadline
      const alarm = yield* Effect.forkChild(manager.alarm)
      yield* Deferred.await(started)

      // The client omits delivery options once the deadline has passed.
      const duplicate = yield* Effect.forkChild(manager.invoke(envelope("Add", { operationId: "same" }), false))
      yield* settle
      yield* Deferred.succeed(release, undefined)
      const original = yield* Fiber.join(first)
      const retried = yield* Fiber.join(duplicate)
      yield* Fiber.join(alarm)

      assert.strictEqual(state.runs, 1, "The duplicate started a second execution of the scheduled ask")
      assert(original._tag === "Success")
      assert.deepStrictEqual(exitOf(original.replies[0]), { _tag: "Success", value: 1 })
      assert.deepStrictEqual(retried, original)
    }))

  it.effect("pushes a running scheduled reply to a reply target added after it started", () =>
    Effect.gen(function*() {
      const { entity, release, started } = yield* makeGatedAsk("ScheduledReplyTargets")
      const pushed: Array<{ readonly replyTo: string; readonly requestId: string; readonly reply: string }> = []
      const { envelope, exitOf, manager } = yield* makeMailbox("targets", entity.type, () => ({
        getByName: (replyTo) => ({
          deliverReply: (requestId, reply) => {
            pushed.push({ replyTo, requestId, reply })
            return Promise.resolve(true)
          }
        })
      }))
      const requestId = nextRequestId()
      yield* manager.invoke(envelope("Add", { operationId: "same" }, requestId), false, {
        deliverAt: Date.now() + 20,
        primaryKey: `${entity.type}/targets/Add/same`,
        replyTo: "6:Callerone"
      })
      yield* pastDeadline
      const alarm = yield* Effect.forkChild(manager.alarm)
      yield* Deferred.await(started)

      // A pinned caller retrying after the deadline sends only its reply target.
      const duplicate = yield* Effect.forkChild(
        manager.invoke(envelope("Add", { operationId: "same" }), false, { replyTo: "6:Callertwo" })
      )
      yield* settle
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(duplicate)
      yield* Fiber.join(alarm)

      const targets = pushed.map((delivery) => delivery.replyTo).sort()
      assert.deepStrictEqual(targets, ["6:Callerone", "6:Callertwo"])
      for (const delivery of pushed) {
        assert.strictEqual(delivery.requestId, requestId)
        assert.deepStrictEqual(exitOf(delivery.reply), { _tag: "Success", value: 1 })
      }
    }))
})
