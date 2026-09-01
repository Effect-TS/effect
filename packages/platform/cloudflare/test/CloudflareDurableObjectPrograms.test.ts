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
import { Context, Effect, Exit } from "effect"

class FakeSql {
  readonly statements: Array<string> = []
  earliestDeliverAt: number | null = null
  earliestClockWakeUp: number | null = null
  earliestLeaseExpiry: number | null = null
  singletonState: { name: string | null; wake_at: number | null } | undefined
  storedExecution: Record<string, unknown> | undefined

  exec(query: string, ..._bindings: Array<unknown>) {
    this.statements.push(query)
    let rows: Array<Record<string, unknown>> = []
    if (query.includes("min(deliver_at)")) {
      rows = [{ deliver_at: this.earliestDeliverAt }]
    } else if (query.includes("min(wake_up)")) {
      rows = [{ wake_up: this.earliestClockWakeUp }]
    } else if (query.includes("min(lease_until)")) {
      rows = [{ lease_until: this.earliestLeaseExpiry }]
    } else if (query.includes("FROM singleton_state")) {
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
          alarms.push(scheduledTime)
          return Promise.resolve()
        },
        deleteAlarm: () => Promise.resolve()
      } as unknown as DurableObjectProgramState["storage"],
      exports: {},
      waitUntil: () => {}
    }
  }
}

describe("CloudflareDurableObjectPrograms", () => {
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

    it.effect("treats an alarm without a stored execution as a no-op", () =>
      Effect.gen(function*() {
        const fake = new FakeState(undefined)
        const program = yield* makeClusterWorkflowProgram(fake.state)
        yield* program.alarm()
      }))
  })

  describe("makeClusterDurableQueueProgram", () => {
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
