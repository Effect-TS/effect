import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Layer } from "effect"
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

it.layer(Layer.mergeAll(Digest.layerWebCrypto, MssqlContainer.layerClient), {
  timeout: "60 seconds",
  excludeTestServices: true
})(
  "SqlEventLogServerEncrypted tables (mssql)",
  (it) => {
    it.effect("opens a store while another instance is creating an index", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const prefix = "indexing"
        const stores = `${prefix}_compaction_stores`
        yield* sql`CREATE TABLE ${sql(stores)} (scope NVARCHAR(36) PRIMARY KEY, next_sweep_at BIGINT NULL)`
        // Hold a separate index creation open, as an older instance would.
        const indexing = yield* Deferred.make<void>()
        yield* sql`CREATE INDEX ${sql(`${stores}_i0`)} ON ${sql(stores)} (next_sweep_at)`.pipe(
          Effect.andThen(Deferred.succeed(indexing, undefined)),
          Effect.andThen(Effect.never),
          sql.withTransaction,
          Effect.forkScoped
        )
        yield* Deferred.await(indexing)

        const outcome = yield* Effect.race(
          SqlEventLogServerEncrypted.makeStorage({ entryTablePrefix: prefix }).pipe(
            Effect.as("opened"),
            Effect.scoped
          ),
          Effect.as(SqlEventLogServerEncryptedStorageTest.awaitLockWait, "waited")
        )

        assert.strictEqual(outcome, "opened")
      }))
  }
)
