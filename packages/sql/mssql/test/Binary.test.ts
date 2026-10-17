import { MssqlClient } from "@effect/sql-mssql"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import type * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import type { StoreId } from "effect/eventlog/EventLogMessage"
import * as EventLogServer from "effect/eventlog/EventLogServerEncrypted"
import * as SqlEventLogServer from "effect/eventlog/SqlEventLogServerEncrypted"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import { Buffer } from "node:buffer"
import type * as Tedious from "tedious"
import { vi } from "vitest"

vi.mock("tedious", async (importOriginal) => {
  const original = await importOriginal<typeof Tedious>()

  class MockConnection extends original.Connection {
    override connect(callback?: (error?: Error) => void) {
      callback?.()
    }
    override close() {}
    override cancel() {
      return false
    }
    override makeRequest(request: Tedious.Request | Tedious.BulkLoad) {
      if (!(request instanceof original.Request)) {
        throw new Error("Unexpected bulk load")
      }
      const query = request.sqlTextOrProcedure?.trimStart() ?? ""
      if (query.startsWith("MERGE")) {
        // Return each source row as an inserted row, preserving the bound bytes.
        const rows = []
        for (let i = 0; i < request.parameters.length; i += 3) {
          rows.push([
            { metadata: { colName: "sequence" }, value: i / 3 + 1 },
            { metadata: { colName: "iv" }, value: request.parameters[i].value },
            { metadata: { colName: "entry_id" }, value: request.parameters[i + 1].value },
            { metadata: { colName: "encrypted_entry" }, value: request.parameters[i + 2].value }
          ])
        }
        request.callback(null, rows.length, rows)
        return
      }
      if (!query.startsWith("SELECT")) {
        request.callback(null, 0, [])
        return
      }
      const rows = request.parameters.map((parameter) => [
        { metadata: { colName: "value" }, value: parameter.value }
      ])
      request.callback(null, rows.length, rows)
    }
  }

  return { ...original, Connection: MockConnection }
})

it.effect("binds an interpolated Uint8Array as VarBinary", () =>
  Effect.gen(function*() {
    const client = yield* MssqlClient.make({
      server: "mock.invalid",
      minConnections: 0,
      maxConnections: 1
    })
    const rows = yield* client<{ value: Uint8Array }>`SELECT ${new Uint8Array([0, 128, 255])} AS value`

    assert.deepStrictEqual(Array.from(rows[0].value), [0, 128, 255])
  }).pipe(Effect.provide(Reactivity.layer)))

for (
  const [name, ids, expected] of [
    ["preserves distinct Buffer entry IDs", [Buffer.alloc(16, 0xff), Buffer.alloc(16, 0xfe)], [0xff, 0xfe]],
    [
      "deduplicates the same entry ID across Buffer and Uint8Array",
      [Buffer.alloc(16, 0xff), new Uint8Array(16).fill(0xff)],
      [0xff]
    ]
  ] as const
) {
  it.effect(name, () =>
    Effect.gen(function*() {
      const client = yield* MssqlClient.make({
        server: "mock.invalid",
        minConnections: 0,
        maxConnections: 1
      })
      const storage = yield* SqlEventLogServer.makeStorage().pipe(
        Effect.provideService(SqlClient.SqlClient, client)
      )
      const written = yield* storage.write(
        "public-key",
        "store-a" as StoreId,
        ids.map((id, index) =>
          new EventLogServer.PersistedEntry({
            entryId: id as EventJournal.EntryId,
            iv: new Uint8Array(12),
            encryptedEntry: Uint8Array.of(index)
          })
        )
      )

      assert.deepStrictEqual(
        written.map((entry) => Array.from(entry.entryId)),
        expected.map((byte) => Array(16).fill(byte))
      )
    }).pipe(Effect.provide([Reactivity.layer, EventLogEncryption.layerSubtle])))
}
