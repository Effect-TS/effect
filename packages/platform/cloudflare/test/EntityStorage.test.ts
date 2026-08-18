import { ensureEntityStorage, rearmAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { assert, describe, it } from "@effect/vitest"

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
}

describe("EntityStorage", () => {
  describe("ensureEntityStorage", () => {
    it("creates the mailbox tables idempotently", () => {
      const sql = new FakeSql()
      ensureEntityStorage(sql)
      const first = [...sql.statements]
      assert.isAtLeast(first.length, 1)
      for (const statement of first) {
        assert.match(statement, /CREATE (TABLE|INDEX) IF NOT EXISTS/)
      }
      assert.isTrue(first.some((statement) => statement.includes("cluster_messages")))
      assert.isTrue(first.some((statement) => statement.includes("cluster_replies")))

      ensureEntityStorage(sql)
      assert.deepStrictEqual(sql.statements, [...first, ...first])
    })
  })

  describe("rearmAlarm", () => {
    it("does nothing without pending deliver_at rows", async () => {
      const sql = new FakeSql()
      const alarm = new FakeAlarm()
      await rearmAlarm(alarm, sql)
      assert.deepStrictEqual(alarm.setCalls, [])
    })

    it("arms the alarm at the earliest deliver_at", async () => {
      const sql = new FakeSql()
      sql.earliestDeliverAt = 1000
      const alarm = new FakeAlarm()
      await rearmAlarm(alarm, sql)
      assert.deepStrictEqual(alarm.setCalls, [1000])
    })

    it("keeps an already earlier alarm", async () => {
      const sql = new FakeSql()
      sql.earliestDeliverAt = 1000
      const alarm = new FakeAlarm()
      alarm.current = 500
      await rearmAlarm(alarm, sql)
      assert.deepStrictEqual(alarm.setCalls, [])
    })

    it("moves a later alarm forward", async () => {
      const sql = new FakeSql()
      sql.earliestDeliverAt = 1000
      const alarm = new FakeAlarm()
      alarm.current = 2000
      await rearmAlarm(alarm, sql)
      assert.deepStrictEqual(alarm.setCalls, [1000])
    })
  })
})
