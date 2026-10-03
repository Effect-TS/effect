import type { DurableObjectProgramState } from "@effect/platform-cloudflare/CloudflareDurableObjectPrograms"
import {
  makeClusterDurableQueueProgram,
  makeClusterEntityProgram,
  makeClusterSingletonProgram,
  makeClusterWorkflowProgram
} from "@effect/platform-cloudflare/CloudflareDurableObjectPrograms"
import { encodeName } from "@effect/platform-cloudflare/internal/clusterName"
import { registerSingleton } from "@effect/platform-cloudflare/internal/singletonRegistry"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit } from "effect"
import { TestClock } from "effect/testing"

class FakeSql {
  readonly statements: Array<string> = []
  readonly executions: Array<{ query: string; bindings: Array<unknown> }> = []
  singletonReadError: Error | undefined
  earliestDeliverAt: number | null = null
  earliestClockWakeUp: number | null = null
  earliestLeaseExpiry: number | null = null
  singletonState: { name: string | null; wake_at: number | null } | undefined
  storedExecution: Record<string, unknown> | undefined

  exec(query: string, ...bindings: Array<unknown>) {
    this.statements.push(query)
    this.executions.push({ query, bindings })
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
      if (this.singletonReadError !== undefined) throw this.singletonReadError
      rows = this.singletonState === undefined ? [] : [this.singletonState]
    } else if (query.includes("FROM workflow_execution")) {
      rows = this.storedExecution === undefined ? [] : [this.storedExecution]
    }
    return { toArray: () => rows }
  }
}

class FakeState {
  readonly sql = new FakeSql()
  readonly alarms: Array<number> = []
  currentAlarm: number | null = null
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
        getAlarm: () => Promise.resolve(this.currentAlarm),
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

    it.effect(`${kind} preserves an earlier alarm during construction`, () =>
      Effect.gen(function*() {
        const fake = pendingState()
        fake.currentAlarm = 1_000
        yield* make(fake.state)
        assert.deepStrictEqual(fake.alarms, [])
      }))

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

  describe("makeClusterEntityProgram", () => {
    it.effect("dies on a non-canonical entity name", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(makeClusterEntityProgram(new FakeState("not-canonical").state))
        assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("ensures the mailbox tables and re-arms the pending alarm", () =>
      Effect.gen(function*() {
        const fake = new FakeState(encodeName("User", "42"))
        fake.sql.earliestDeliverAt = 1_234
        yield* makeClusterEntityProgram(fake.state)
        assert.isTrue(fake.sql.statements.some((statement) => statement.includes("cluster_messages")))
        assert.deepStrictEqual(fake.alarms, [1_234])
      }))

    it.effect("skips the alarm without pending deliveries", () =>
      Effect.gen(function*() {
        const fake = new FakeState(encodeName("User", "42"))
        yield* makeClusterEntityProgram(fake.state)
        assert.deepStrictEqual(fake.alarms, [])
      }))
  })

  describe("makeClusterWorkflowProgram", () => {
    it.effect("uses the current TestClock time when finding due workflow clocks", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(1_000)
        const fake = new FakeState(encodeName("SendEmail", "clock-test"))
        const program = yield* makeClusterWorkflowProgram(fake.state)
        yield* TestClock.adjust(500)
        yield* program.alarm()
        yield* TestClock.adjust(500)
        yield* program.alarm()
        const reads = fake.sql.executions.filter(({ query }) => query.includes("wake_up <= ?"))
        assert.deepStrictEqual(reads.map(({ bindings }) => bindings), [[1_500], [2_000]])
      }))

    it.effect("dies on a non-canonical workflow name", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(makeClusterWorkflowProgram(new FakeState("not-canonical").state))
        assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("re-arms the pending clock alarm", () =>
      Effect.gen(function*() {
        const fake = new FakeState(encodeName("SendEmail", "execution-1"))
        fake.sql.earliestClockWakeUp = 5_678
        yield* makeClusterWorkflowProgram(fake.state)
        assert.isTrue(fake.sql.statements.some((statement) => statement.includes("workflow_execution")))
        assert.deepStrictEqual(fake.alarms, [5_678])
      }))

    it.effect("recovers the workflow name and persisted result after eviction", () =>
      Effect.gen(function*() {
        const fake = new FakeState()
        const result = "{\"_tag\":\"Complete\"}"
        fake.sql.storedExecution = {
          workflow_name: "SendEmail",
          execution_id: "execution-1",
          payload: "{}",
          parent_name: null,
          parent_execution_id: null,
          result,
          resume_pending: 0
        }
        const program = yield* makeClusterWorkflowProgram(fake.state)
        assert.strictEqual(yield* program.poll(), result)
      }))

    it.effect("treats an alarm without a stored execution as a no-op", () =>
      Effect.gen(function*() {
        const fake = new FakeState(undefined)
        const program = yield* makeClusterWorkflowProgram(fake.state)
        yield* program.alarm()
      }))
  })

  describe("makeClusterDurableQueueProgram", () => {
    it.effect("uses the current TestClock time for queue lease extensions", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(1_000)
        const fake = new FakeState(encodeName("queue", "clock-test"))
        const program = yield* makeClusterDurableQueueProgram(fake.state)
        yield* TestClock.adjust(500)
        yield* program.extend("item-1", 300)
        yield* TestClock.adjust(500)
        yield* program.extend("item-1", 300)
        const updates = fake.sql.executions.filter(({ query }) => query.includes("SET lease_until = ?"))
        assert.deepStrictEqual(updates.map(({ bindings }) => bindings), [[1_800, "item-1"], [2_300, "item-1"]])
      }))

    it.effect("dies on a non-canonical queue name", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(makeClusterDurableQueueProgram(new FakeState("not-canonical").state))
        assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("ensures the queue table and re-arms the pending lease alarm", () =>
      Effect.gen(function*() {
        const fake = new FakeState(encodeName("queue", "emails"))
        fake.sql.earliestLeaseExpiry = 9_876
        yield* makeClusterDurableQueueProgram(fake.state)
        assert.isTrue(fake.sql.statements.some((statement) => statement.includes("queue_items")))
        assert.deepStrictEqual(fake.alarms, [9_876])
      }))
  })

  describe("makeClusterSingletonProgram", () => {
    it.effect("defers singleton state reads until the alarm Effect executes", () =>
      Effect.gen(function*() {
        const fake = new FakeState()
        const program = yield* makeClusterSingletonProgram(fake.state)
        const before = fake.sql.statements.length
        const alarm = program.alarm()
        assert.strictEqual(fake.sql.statements.length, before)
        yield* alarm
        assert.isAbove(fake.sql.statements.length, before)
      }))

    it.effect("captures singleton alarm storage errors in the Effect defect channel", () =>
      Effect.gen(function*() {
        const fake = new FakeState()
        const program = yield* makeClusterSingletonProgram(fake.state)
        const error = new Error("singleton state unavailable")
        fake.sql.singletonReadError = error
        // Construct the Effect directly: an eager throw here must fail this
        // test, rather than being caught by an extra test-owned suspension.
        const exit = yield* Effect.exit(program.alarm())
        assert.isTrue(Exit.hasDies(exit))
        if (Exit.isFailure(exit)) assert.strictEqual(Cause.squash(exit.cause), error)
      }))

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

    it.effect("uses the current TestClock time for singleton watchdog alarms", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(1_000)
        registerSingleton("program-clock", { run: Effect.void, context: Context.empty() })
        const fake = new FakeState("Singleton/program-clock")
        const program = yield* makeClusterSingletonProgram(fake.state)
        yield* TestClock.adjust(500)
        yield* program.wake()
        yield* TestClock.adjust(500)
        yield* program.wake()
        assert.deepStrictEqual(fake.alarms, [1_500, 2_000])
      }))

    it.effect("dies without the Singleton/ name prefix", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(makeClusterSingletonProgram(new FakeState("not-prefixed").state))
        assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("remembers the name and re-arms the watchdog alarm", () =>
      Effect.gen(function*() {
        const fake = new FakeState("Singleton/maintenance")
        fake.sql.singletonState = { name: "Singleton/maintenance", wake_at: 4_321 }
        yield* makeClusterSingletonProgram(fake.state)
        assert.isTrue(fake.sql.statements.some((statement) => statement.includes("INSERT INTO singleton_state")))
        assert.deepStrictEqual(fake.alarms, [4_321])
      }))

    it.effect("recovers the singleton name and completes a pending wake after eviction", () =>
      Effect.gen(function*() {
        let runs = 0
        registerSingleton("program-recovered", {
          run: Effect.sync(() => {
            runs++
          }),
          context: Context.empty()
        })
        const fake = new FakeState()
        fake.sql.singletonState = { name: "Singleton/program-recovered", wake_at: 4_321 }
        const program = yield* makeClusterSingletonProgram(fake.state)
        assert.strictEqual(runs, 0)
        yield* program.alarm()
        assert.strictEqual(runs, 1)
        assert.strictEqual(fake.sql.singletonState.wake_at, null)
        assert.strictEqual(fake.deletedAlarms, 1)
        yield* program.alarm()
        assert.strictEqual(runs, 1)
      }))

    it.effect("ignores an alarm without a pending singleton wake or registration", () =>
      Effect.gen(function*() {
        const program = yield* makeClusterSingletonProgram(new FakeState().state)
        yield* program.alarm()
      }))

    it.effect("wakes the registered singleton", () =>
      Effect.gen(function*() {
        let ran = false
        registerSingleton("program-test", {
          run: Effect.sync(() => {
            ran = true
          }),
          context: Context.empty()
        })
        const fake = new FakeState("Singleton/program-test")
        const program = yield* makeClusterSingletonProgram(fake.state)
        yield* program.wake()
        assert.isTrue(ran)
      }))
  })
})
