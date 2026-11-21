import type { DurableObjectStorage } from "@cloudflare/workers-types"
import type { DurableObjectProgramState } from "@effect/platform-cloudflare/CloudflareDurableObjectPrograms"
import {
  makeClusterDurableQueueProgram,
  makeClusterEntityProgram,
  makeClusterSingletonProgram,
  makeClusterWorkflowProgram
} from "@effect/platform-cloudflare/CloudflareDurableObjectPrograms"
import { encodeName } from "@effect/platform-cloudflare/internal/clusterName"
import { registerEntity, unregisterEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import type { EntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { ensureEntityStorage, rememberEntityName } from "@effect/platform-cloudflare/internal/entityStorage"
import { registerSingleton } from "@effect/platform-cloudflare/internal/singletonRegistry"
import {
  createExecution,
  ensureWorkflowStorage,
  saveCompletion
} from "@effect/platform-cloudflare/internal/workflowStorage"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Schema } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { TestClock } from "effect/testing"
import { DatabaseSync } from "node:sqlite"
import { SqliteStorage } from "./fixtures/sqliteStorage.ts"

class FakeSql {
  earliestDeliverAt: number | null = null
  earliestClockWakeUp: number | null = null
  earliestLeaseExpiry: number | null = null
  singletonState: { name: string | null; wake_at: number | null } | undefined

  exec(query: string) {
    let rows: Array<Record<string, unknown>> = []
    if (query.includes("min(deliver_at)")) {
      rows = [{ deliver_at: this.earliestDeliverAt }]
    } else if (query.includes("min(wake_up)")) {
      rows = [{ wake_up: this.earliestClockWakeUp }]
    } else if (query.includes("min(lease_until)")) {
      rows = [{ lease_until: this.earliestLeaseExpiry }]
    } else if (query.includes("UPDATE singleton_state SET wake_at = NULL")) {
      if (this.singletonState !== undefined) this.singletonState.wake_at = null
    } else if (query.includes("FROM singleton_state")) {
      rows = this.singletonState === undefined ? [] : [this.singletonState]
    }
    return { toArray: () => rows }
  }
}

class FakeState {
  readonly sql = new FakeSql()
  readonly alarms: Array<number> = []
  alarmError: Error | undefined
  deletedAlarms = 0
  name: string | undefined

  constructor(name?: string) {
    this.name = name
  }

  get state(): DurableObjectProgramState {
    const sql = this.sql
    const alarms = this.alarms
    return {
      id: { name: this.name },
      storage: {
        sql,
        getAlarm: () => Promise.resolve(null),
        setAlarm: (scheduledTime: number) => {
          if (this.alarmError !== undefined) return Promise.reject(this.alarmError)
          alarms.push(scheduledTime)
          return Promise.resolve()
        },
        deleteAlarm: () => {
          this.deletedAlarms++
          return Promise.resolve()
        }
      } as unknown as DurableObjectProgramState["storage"],
      exports: {},
      waitUntil: () => {}
    }
  }
}

// A `ctx.exports` loopback namespace that records which (sub)namespace each
// call went through.
interface LoopbackCall {
  readonly scope: string
  readonly name: string
  readonly method: string
}

const makeLoopbackNamespace = (calls: Array<LoopbackCall>) => {
  const scoped = (scope: string) => ({
    getByName: (name: string) => {
      const record = <A>(method: string, result: Promise<A>) => () => {
        calls.push({ scope, name, method })
        return result
      }
      return {
        // Never settles, like the hold of a pinned entity.
        hold: record("hold", new Promise<void>(() => {})),
        resume: record("resume", Promise.resolve()),
        deliverReply: record("deliverReply", Promise.resolve(true))
      }
    }
  })
  return { ...scoped("unrestricted"), jurisdiction: scoped }
}

// The state of an object reached through `env.X.jurisdiction("eu")`, on real
// SQLite storage.
const makeJurisdictionState = Effect.fnUntraced(function*(name: string) {
  const database = yield* Effect.acquireRelease(
    Effect.sync(() => new DatabaseSync(":memory:")),
    (database) => Effect.sync(() => database.close())
  )
  const storage = new SqliteStorage(database)
  const calls: Array<LoopbackCall> = []
  const pending: Array<Promise<unknown>> = []
  const state: DurableObjectProgramState = {
    id: { name, jurisdiction: "eu" },
    storage: storage as unknown as DurableObjectStorage,
    exports: { ClusterEntity: makeLoopbackNamespace(calls), ClusterWorkflow: makeLoopbackNamespace(calls) },
    waitUntil: (promise) => {
      pending.push(promise)
    }
  }
  return { state, storage, calls, settled: Effect.promise(() => Promise.allSettled(pending)) }
})

// Registers a one-handler entity for the test. Tests in a file may overlap,
// so each uses its own entity type.
const registerProbe = Effect.fnUntraced(function*(type: string) {
  const entity = Entity.make(type, [
    Rpc.make("Add", {
      payload: { operationId: Schema.String },
      primaryKey: ({ operationId }) => operationId,
      success: Schema.Number
    }).annotate(ClusterSchema.Persisted, true)
  ])
  const registration: EntityRegistration = {
    entity,
    keepAliveHeartbeat: 30_000,
    build: Effect.succeed(entity.of({ Add: () => Effect.succeed(1) })),
    options: undefined,
    context: Context.empty()
  }
  yield* Effect.acquireRelease(
    Effect.sync(() => registerEntity(type, registration)),
    () => Effect.sync(() => unregisterEntity(type, registration))
  )
})

// it.effect runs on the TestClock; this waits on the real event loop.
const settle = Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 10)))

// Waits on the real clock until a just-scheduled deadline has passed.
const pastDeadline = Effect.sleep("50 millis").pipe(TestClock.withLive)

describe("CloudflareDurableObjectPrograms", () => {
  const constructors = [
    ["entity", makeClusterEntityProgram],
    ["workflow", makeClusterWorkflowProgram],
    ["queue", makeClusterDurableQueueProgram],
    ["singleton", makeClusterSingletonProgram]
  ] as const

  for (const [kind, make] of constructors) {
    const pendingState = () => {
      const fake = new FakeState(kind === "singleton" ? "Singleton/alarm-test" : encodeName("Test", "1"))
      fake.sql.earliestDeliverAt = 2_000
      fake.sql.earliestClockWakeUp = 2_000
      fake.sql.earliestLeaseExpiry = 2_000
      fake.sql.singletonState = { name: "Singleton/alarm-test", wake_at: 2_000 }
      return fake
    }

    it.effect(`${kind} propagates failure to re-arm persisted work`, () =>
      Effect.gen(function*() {
        const fake = pendingState()
        const error = new Error("alarm storage unavailable")
        fake.alarmError = error
        const construction: Effect.Effect<unknown> = make(fake.state)
        const exit = yield* Effect.exit(construction)
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          assert.deepStrictEqual(Cause.squash(exit.cause), error)
        }
      }))
  }

  describe("makeClusterSingletonProgram", () => {
    it.effect("observes a pending wake added after constructing the alarm Effect", () =>
      Effect.gen(function*() {
        let runs = 0
        registerSingleton("program-deferred-state", {
          run: Effect.sync(() => {
            runs++
          }),
          context: Context.empty()
        })
        const fake = new FakeState("Singleton/program-deferred-state")
        const program = yield* makeClusterSingletonProgram(fake.state)
        const alarm = program.alarm()
        fake.sql.singletonState = { name: "Singleton/program-deferred-state", wake_at: 1_000 }
        yield* alarm
        assert.strictEqual(runs, 1)
        assert.strictEqual(fake.sql.singletonState.wake_at, null)
        // Reusing the same Effect must observe the now-cleared pending wake.
        yield* alarm
        assert.strictEqual(runs, 1)
        assert.strictEqual(fake.deletedAlarms, 1)
      }))
  })

  describe("an object restricted to a jurisdiction", () => {
    it.effect("a completed child workflow wakes its parent in the same jurisdiction", () =>
      Effect.gen(function*() {
        const { calls, settled, state, storage } = yield* makeJurisdictionState(encodeName("Child", "c1"))
        ensureWorkflowStorage(storage.sql)
        createExecution(storage.sql, "Child", "c1", "{}", { workflowName: "Parent", executionId: "p1" })
        saveCompletion(storage.sql, JSON.stringify({ _tag: "Complete" }), true)

        const program = yield* makeClusterWorkflowProgram(state)
        yield* program.alarm()
        yield* settled

        assert.deepStrictEqual(calls, [{ scope: "eu", name: encodeName("Parent", "p1"), method: "resume" }])
      }))

    it.effect("a kept-alive entity holds itself in the same jurisdiction", () =>
      Effect.gen(function*() {
        yield* registerProbe("JurisdictionHold")
        const name = encodeName("JurisdictionHold", "k1")
        const { calls, state, storage } = yield* makeJurisdictionState(name)
        ensureEntityStorage(storage.sql)
        rememberEntityName(storage.sql, name)
        storage.sql.exec("UPDATE cluster_entity_state SET keep_alive = 1 WHERE id = 0")

        const program = yield* makeClusterEntityProgram(state)
        // The heartbeat alarm rebuilds the entity, which restores the hold.
        yield* program.alarm()
        yield* settle

        assert.deepStrictEqual(calls, [{ scope: "eu", name, method: "hold" }])
      }))

    it.effect("a scheduled ask pushes its reply to the caller in the same jurisdiction", () =>
      Effect.gen(function*() {
        yield* registerProbe("JurisdictionReply")
        const caller = encodeName("JurisdictionReply", "caller")
        const { calls, state } = yield* makeJurisdictionState(encodeName("JurisdictionReply", "r1"))
        const program = yield* makeClusterEntityProgram(state)
        const envelope = JSON.stringify({
          _tag: "Request",
          requestId: "0198bd72-6a80-72f1-8d87-000000000001",
          address: { shardId: { group: "default", id: 1 }, entityType: "JurisdictionReply", entityId: "r1" },
          tag: "Add",
          payload: { operationId: "op" },
          headers: {}
        })
        yield* program.invoke(envelope, false, {
          deliverAt: Date.now() + 20,
          primaryKey: "JurisdictionReply/r1/Add/op",
          replyTo: caller
        })
        yield* pastDeadline
        yield* program.alarm()
        yield* settle

        assert.deepStrictEqual(calls, [{ scope: "eu", name: caller, method: "deliverReply" }])
      }))
  })
})
