import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer } from "effect"
import * as CompactionTest from "effect-test/eventlog/EventLogServerEncryptedCompactionTest"
import * as EncryptedTest from "effect-test/eventlog/EventLogServerEncryptedTest"
import * as SqlEventLogServerEncryptedStorageTest from "effect-test/eventlog/SqlEventLogServerEncryptedStorageTest"
import * as Digest from "effect/crypto/Digest"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as SqlEventLogServerEncrypted from "effect/eventlog/SqlEventLogServerEncrypted"
import { Reactivity } from "effect/reactivity"
import { SqlClient } from "effect/sql"
import { MssqlContainer } from "./utils.ts"

EncryptedTest.suite(
  "mssql",
  SqlEventLogServerEncrypted.layerStorage().pipe(
    Layer.provide([MssqlContainer.layerClient, Reactivity.layer, EventLogEncryption.layerSubtle, Digest.layerWebCrypto])
  )
)

SqlEventLogServerEncryptedStorageTest.suite("mssql", MssqlContainer.layerClient)

CompactionTest.suite(
  "mssql",
  (options) => SqlEventLogServerEncrypted.layerStorage(options).pipe(Layer.provide(Digest.layerWebCrypto)),
  MssqlContainer.layerClient
)

SqlEventLogServerEncryptedStorageTest.compactionSuite("mssql", MssqlContainer.layerClient)

// Succeeds once a request waits on a lock that session `spid` holds.
const blockedBy = Effect.fnUntraced(function*(spid: number) {
  const sql = yield* SqlClient.SqlClient
  while (true) {
    const [row] = yield* sql<{ n: number }>`
      SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE blocking_session_id = ${spid}`
    if (row.n > 0) return "waited" as const
    yield* Effect.sleep(20)
  }
})

it.layer(Layer.mergeAll(Digest.layerWebCrypto, MssqlContainer.layerClient), {
  timeout: "60 seconds",
  excludeTestServices: true
})(
  "SqlEventLogServerEncrypted tables (mssql)",
  (it) => {
    it.effect("opens a store while another instance is creating an index", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const prefix = `indexing_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`
        const stores = `${prefix}_compaction_stores`
        // Another instance created the stores table and is in the middle of
        // creating its index. A statement waiting on that index holds locks the
        // index's creation needs next, which SQL Server only breaks as a
        // deadlock after up to 5 seconds.
        yield* sql`CREATE TABLE ${sql(stores)} (scope NVARCHAR(36) PRIMARY KEY, next_sweep_at BIGINT NULL)`
        const indexing = yield* Deferred.make<number>()
        const release = yield* Deferred.make<void>()
        const other = yield* sql.withTransaction(Effect.gen(function*() {
          yield* sql`CREATE INDEX ${sql(`${stores}_i0`)} ON ${sql(stores)} (next_sweep_at)`
          const [row] = yield* sql<{ spid: number }>`SELECT @@SPID AS spid`
          yield* Deferred.succeed(indexing, row.spid)
          yield* Deferred.await(release)
        })).pipe(Effect.forkChild)
        const spid = yield* Deferred.await(indexing)

        const opened = SqlEventLogServerEncrypted.makeStorage({
          entryTablePrefix: prefix,
          remoteIdTable: `${prefix}_remote_id`
        }).pipe(Effect.as("opened" as const), Effect.scoped)
        const outcome = yield* Effect.race(opened, blockedBy(spid))
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(other)

        assert.strictEqual(outcome, "opened")
      }))

    it.effect("names the indexes it creates with their tables", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const prefix = `indexes_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`
        yield* SqlEventLogServerEncrypted.makeStorage({
          entryTablePrefix: prefix,
          remoteIdTable: `${prefix}_remote_id`
        }).pipe(Effect.scoped)

        const rows = yield* sql<{ name: string }>`
          SELECT i.name FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id
          WHERE t.name LIKE ${`${prefix}_compaction_%`} AND i.is_primary_key = 0 AND i.name IS NOT NULL
          ORDER BY i.name`
        assert.deepStrictEqual(rows.map((row) => row.name), [
          `${prefix}_compaction_activations_i0`,
          `${prefix}_compaction_stages_i0`,
          `${prefix}_compaction_stages_i1`,
          `${prefix}_compaction_stores_i0`
        ])
      }))
  }
)
