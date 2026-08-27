import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as EventJournal from "effect/unstable/eventlog/EventJournal"
import * as SqlEventJournal from "effect/unstable/eventlog/SqlEventJournal"
import { Reactivity } from "effect/unstable/reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { vi } from "vitest"

const state = vi.hoisted(() => {
  const entryRows: Array<Record<string, unknown>> = []
  const existingIdRows: Array<Record<string, unknown>> = []
  const executeSync = (query: string) => ({
    rowsAffected: 0,
    rows: query.includes("SELECT id FROM") ?
      existingIdRows :
      query.includes("SELECT * FROM") && !query.includes("WHERE") ?
      entryRows :
      []
  })
  return {
    entryRows,
    existingIdRows,
    database: {
      close() {},
      execute: async (query: string) => executeSync(query),
      executeRaw: async () => [],
      executeRawSync: () => [],
      executeSync
    }
  }
})

vi.mock("@op-engineering/op-sqlite", () => ({
  open: () => state.database
}))

import { SqliteClient } from "@effect/sql-sqlite-react-native"

const makeJournal = Effect.gen(function*() {
  const sql = yield* SqliteClient.make({ filename: "test.db" })
  const journal = yield* SqlEventJournal.make().pipe(
    Effect.provideService(SqlClient.SqlClient, sql)
  )
  return { journal, sql }
}).pipe(Effect.provide(Reactivity.layer))

const reset = () => {
  state.entryRows.length = 0
  state.existingIdRows.length = 0
}

describe("SqlEventJournal", () => {
  it.effect("decodes ArrayBuffer entry blobs", () =>
    Effect.gen(function*() {
      reset()
      const id = EventJournal.makeEntryIdUnsafe({ msecs: 1_000 })
      const payload = new Uint8Array([1, 2, 3])
      state.entryRows.push({
        id: Uint8Array.from(id).buffer,
        event: "UserCreated",
        primary_key: "user-1",
        payload: Uint8Array.from(payload).buffer,
        timestamp: EventJournal.entryIdMillis(id)
      })

      const { journal, sql } = yield* makeJournal
      const rawRows = yield* sql`SELECT * FROM effect_event_journal ORDER BY timestamp ASC`
      assert.instanceOf(rawRows[0]?.id, ArrayBuffer)
      assert.instanceOf(rawRows[0]?.payload, ArrayBuffer)

      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.instanceOf(entries[0].id, Uint8Array)
      assert.instanceOf(entries[0].payload, Uint8Array)
      assert.deepStrictEqual(entries[0].id, id)
      assert.deepStrictEqual(entries[0].payload, payload)
    }))

  it.effect("detects duplicates from ArrayBuffer ids", () =>
    Effect.gen(function*() {
      reset()
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe({ msecs: 1_000 }),
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1, 2, 3])
      }, { disableChecks: true })
      state.existingIdRows.push({ id: Uint8Array.from(entry.id).buffer })

      const { journal } = yield* makeJournal
      let effectCalled = false
      const result = yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry })],
        effect: () =>
          Effect.sync(() => {
            effectCalled = true
          })
      })

      assert.deepStrictEqual(result.duplicateEntries, [entry])
      assert.isFalse(effectCalled)
    }))
})
