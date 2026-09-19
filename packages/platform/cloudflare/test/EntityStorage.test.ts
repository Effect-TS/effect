import type { SqlStorage } from "@cloudflare/workers-types"
import type { EntityAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { armAlarm, earliestDeliverAt, ensureEntityStorage } from "@effect/platform-cloudflare/internal/entityStorage"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

class FakeSql {
  readonly statements: Array<string> = []
  earliestDeliverAt: number | null = null

  exec(query: string, ..._bindings: Array<unknown>) {
    this.statements.push(query)
    const rows: Array<Record<string, unknown>> = query.includes("min(deliver_at)")
      ? [{ deliver_at: this.earliestDeliverAt }]
      : []
    return { toArray: () => rows }
  }

  get sql(): SqlStorage {
    return this as unknown as SqlStorage
  }
}

class FakeAlarm {
  readonly setCalls: Array<number> = []
  current: number | null = null

  getAlarm() {
    return Promise.resolve(this.current)
  }
  setAlarm(scheduledTime: number) {
    this.setCalls.push(scheduledTime)
    this.current = scheduledTime
    return Promise.resolve()
  }

  get alarm(): EntityAlarm {
    return this as unknown as EntityAlarm
  }
}

describe("EntityStorage", () => {
  describe("ensureEntityStorage", () => {
    it("creates the mailbox tables idempotently", () => {
      const sql = new FakeSql()
      ensureEntityStorage(sql.sql)
      const first = [...sql.statements]
      assert.isAtLeast(first.length, 1)
      for (const statement of first) {
        assert.match(statement, /CREATE (TABLE|INDEX) IF NOT EXISTS/)
      }
      assert.isTrue(first.some((statement) => statement.includes("cluster_messages")))
      assert.isTrue(first.some((statement) => statement.includes("cluster_replies")))

      ensureEntityStorage(sql.sql)
      assert.deepStrictEqual(sql.statements, [...first, ...first])
    })
  })

  describe("earliestDeliverAt", () => {
    it("returns undefined without pending deliver_at rows", () => {
      assert.isUndefined(earliestDeliverAt(new FakeSql().sql))
    })

    it("returns the earliest pending deliver_at", () => {
      const sql = new FakeSql()
      sql.earliestDeliverAt = 1000
      assert.strictEqual(earliestDeliverAt(sql.sql), 1000)
    })
  })

  describe("armAlarm", () => {
    it.effect("arms an unset alarm", () =>
      Effect.gen(function*() {
        const alarm = new FakeAlarm()
        yield* armAlarm(alarm.alarm, 1000)
        assert.deepStrictEqual(alarm.setCalls, [1000])
      }))

    it.effect("keeps an already earlier alarm", () =>
      Effect.gen(function*() {
        const alarm = new FakeAlarm()
        alarm.current = 500
        yield* armAlarm(alarm.alarm, 1000)
        assert.deepStrictEqual(alarm.setCalls, [])
      }))

    it.effect("moves a later alarm forward", () =>
      Effect.gen(function*() {
        const alarm = new FakeAlarm()
        alarm.current = 2000
        yield* armAlarm(alarm.alarm, 1000)
        assert.deepStrictEqual(alarm.setCalls, [1000])
      }))
  })
})
