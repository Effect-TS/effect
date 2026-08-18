import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import type { EntityAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { armAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { makeSingletonRuntime } from "@effect/platform-cloudflare/internal/singletonRuntime"
import {
  beginSingletonWake,
  ensureSingletonStorage,
  loadSingletonState,
  rememberSingletonName
} from "@effect/platform-cloudflare/internal/singletonStorage"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

class FakeSql {
  readonly statements: Array<string> = []
  name: string | undefined
  wakeAt: number | null = null

  exec(query: string, ...bindings: Array<unknown>) {
    this.statements.push(query)
    if (query.startsWith("CREATE")) return this.rows([])
    if (query.startsWith("SELECT name, wake_at")) {
      return this.rows(
        this.name === undefined && this.wakeAt === null
          ? []
          : [{ name: this.name ?? null, wake_at: this.wakeAt }]
      )
    }
    if (query.includes("INSERT INTO singleton_state (id, name)")) {
      this.name = String(bindings[0])
      return this.rows([])
    }
    if (query.includes("INSERT INTO singleton_state (id, wake_at)")) {
      this.wakeAt = Number(bindings[0])
      return this.rows([])
    }
    if (query.startsWith("UPDATE singleton_state SET wake_at = NULL")) {
      this.wakeAt = null
      return this.rows([])
    }
    throw new Error(`Unexpected SQL: ${query}`)
  }

  private rows(rows: Array<Record<string, unknown>>) {
    return { toArray: () => rows }
  }

  get sql(): SqlStorage {
    return this as unknown as SqlStorage
  }
}

class FakeAlarm {
  readonly setCalls: Array<number> = []
  deleteCalls = 0
  current: number | null = null

  getAlarm() {
    return Promise.resolve(this.current)
  }

  setAlarm(scheduledTime: number) {
    this.setCalls.push(scheduledTime)
    this.current = scheduledTime
    return Promise.resolve()
  }

  deleteAlarm() {
    this.deleteCalls++
    this.current = null
    return Promise.resolve()
  }

  get alarm(): Pick<DurableObjectStorage, "deleteAlarm" | "getAlarm" | "setAlarm"> {
    return this as unknown as Pick<DurableObjectStorage, "deleteAlarm" | "getAlarm" | "setAlarm">
  }
}

describe("Singleton", () => {
  it.effect("runs one wake to completion, coalesces a duplicate, then accepts the next fire", () => {
    const sql = new FakeSql()
    const alarm = new FakeAlarm()
    let runs = 0
    let release!: () => void
    let started!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const running = new Promise<void>((resolve) => {
      started = resolve
    })
    const runtime = makeSingletonRuntime({
      sql: sql.sql,
      alarm: alarm.alarm,
      now: () => 100,
      run: Effect.sync(() => {
        runs++
        started()
      }).pipe(Effect.andThen(Effect.promise(() => gate)))
    })

    return Effect.gen(function*() {
      const first = runtime.wake()
      yield* Effect.promise(() => running)
      assert.strictEqual(runs, 1)

      // This returns immediately instead of extending the current wake.
      yield* Effect.promise(() => runtime.wake())
      assert.strictEqual(runs, 1)

      release()
      yield* Effect.promise(() => first)
      assert.deepStrictEqual(loadSingletonState(sql.sql), { name: undefined, wakeAt: undefined })
      assert.strictEqual(alarm.current, null)

      // A later Cron Trigger is a new intended fire.
      yield* Effect.promise(() => runtime.wake())
      assert.strictEqual(runs, 2)
      assert.strictEqual(alarm.deleteCalls, 2)
    })
  })

  it.effect("re-arms and completes a wake left pending by isolate loss", () => {
    const sql = new FakeSql()
    const alarm = new FakeAlarm()
    ensureSingletonStorage(sql.sql)
    rememberSingletonName(sql.sql, "Singleton/recovery")
    assert.isTrue(beginSingletonWake(sql.sql, 50))

    return Effect.gen(function*() {
      const pending = loadSingletonState(sql.sql)
      assert.deepStrictEqual(pending, { name: "Singleton/recovery", wakeAt: 50 })
      yield* armAlarm(alarm as unknown as EntityAlarm, pending.wakeAt!)

      let runs = 0
      const runtime = makeSingletonRuntime({
        sql: sql.sql,
        alarm: alarm.alarm,
        now: () => 100,
        run: Effect.sync(() => runs++)
      })
      yield* Effect.promise(() => runtime.runAlarm())

      assert.strictEqual(runs, 1)
      assert.deepStrictEqual(alarm.setCalls, [50])
      assert.strictEqual(alarm.current, null)
      assert.deepStrictEqual(loadSingletonState(sql.sql), { name: "Singleton/recovery", wakeAt: undefined })
    })
  })

  it("ensures its SQLite table idempotently", () => {
    const sql = new FakeSql()
    ensureSingletonStorage(sql.sql)
    ensureSingletonStorage(sql.sql)
    assert.strictEqual(sql.statements.filter((statement) => statement.startsWith("CREATE")).length, 2)
    for (const statement of sql.statements) {
      assert.match(statement, /CREATE TABLE IF NOT EXISTS singleton_state/)
    }
  })
})
