import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Stream } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import type { StoreId } from "effect/eventlog/EventLogMessage"
import * as SqlEventLogServerEncrypted from "effect/eventlog/SqlEventLogServerEncrypted"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"

const storeId = "store-a" as StoreId
let nextNamespace = 0

const makeBatch = (...entryIds: Array<EventJournal.EntryId>): EventLogEncryption.EncryptedBatch => ({
  entryIds: entryIds as [EventJournal.EntryId, ...Array<EventJournal.EntryId>],
  iv: new Uint8Array(12),
  encryptedBatch: Uint8Array.of(entryIds.length)
})

const ids = (batches: ReadonlyArray<{ readonly entryIds: ReadonlyArray<EventJournal.EntryId> }>) =>
  batches.map((batch) => batch.entryIds.map((id) => Array.from(id).join(",")))

// Waits until another connection is blocked on a lock held by an open transaction.
const awaitLockWait = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const waiting = sql.onDialectOrElse({
    pg: () =>
      sql<{ n: number }>`
        SELECT COUNT(*)::int AS n FROM pg_stat_activity
        WHERE wait_event_type = 'Lock' AND datname = current_database()`,
    mysql: () => sql<{ n: number }>`SELECT COUNT(*) AS n FROM performance_schema.data_lock_waits`,
    mssql: () => sql<{ n: number }>`SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE blocking_session_id <> 0`,
    orElse: () => Effect.die("competing writers need a server dialect")
  })
  for (let attempt = 0; attempt < 500; attempt++) {
    const [row] = yield* waiting
    if (Number(row.n) > 0) return
    yield* Effect.sleep(10)
  }
  return yield* Effect.die("the competing writer never waited on a lock")
})

// Writer A holds its write open in a transaction until writer B, a separate
// storage standing in for another server process, is blocked on it. B retries
// once if it loses, as a client retries a failed write.
const competingWrites = Effect.fnUntraced(function*(
  first: EventLogEncryption.EncryptedBatch,
  second: EventLogEncryption.EncryptedBatch
) {
  const sql = yield* SqlClient.SqlClient
  const publicKey = crypto.randomUUID()
  // Own tables, so other suites sharing the database don't race on creating them.
  const namespace = `competing_${++nextNamespace}`
  const options = { entryTablePrefix: `${namespace}_events`, remoteIdTable: `${namespace}_remote_id` }
  const storageA = yield* SqlEventLogServerEncrypted.makeStorage(options)
  const storageB = yield* SqlEventLogServerEncrypted.makeStorage(options)
  // Create the scope's tables first, so only the writes compete.
  const setup = makeBatch(EventJournal.makeEntryIdUnsafe())
  yield* storageA.write(publicKey, storeId, [setup])
  yield* storageB.changes(publicKey, storeId, 0).pipe(Stream.take(1), Stream.runDrain)

  const written = yield* Deferred.make<void>()
  const commit = yield* Deferred.make<void>()
  const writerA = yield* sql.withTransaction(Effect.gen(function*() {
    yield* storageA.write(publicKey, storeId, [first])
    yield* Deferred.succeed(written, undefined)
    yield* Deferred.await(commit)
  })).pipe(Effect.forkChild)
  yield* Deferred.await(written)

  const writerB = yield* storageB.write(publicKey, storeId, [second]).pipe(Effect.forkChild)
  yield* awaitLockWait
  yield* Deferred.succeed(commit, undefined)
  yield* Fiber.join(writerA)
  const attempt = yield* Fiber.await(writerB)
  const stored = Exit.isSuccess(attempt) ? attempt.value : yield* storageB.write(publicKey, storeId, [second])

  const persisted = yield* storageA.changes(publicKey, storeId, 0).pipe(Stream.take(3), Stream.runCollect)
  return { stored, persisted: persisted.slice(1) }
})

export const suite = (name: string, layer: Layer.Layer<SqlClient.SqlClient, unknown>) =>
  it.layer(
    Layer.mergeAll(Reactivity.layer, EventLogEncryption.layerSubtle, layer),
    { timeout: "60 seconds", excludeTestServices: true }
  )(`SqlEventLogServerEncrypted storage (${name})`, (it) => {
    it.effect("stores a batch with more ids than one statement can bind", () =>
      Effect.gen(function*() {
        const publicKey = crypto.randomUUID()
        const namespace = `oversized_${++nextNamespace}`
        const storage = yield* SqlEventLogServerEncrypted.makeStorage({
          entryTablePrefix: `${namespace}_events`,
          remoteIdTable: `${namespace}_remote_id`
        })
        // Above the bind parameter limits: 2100 on SQL Server, 32767 for the
        // PostgreSQL client and 65535 on MySQL.
        const batch: EventLogEncryption.EncryptedBatch = {
          entryIds: Array.from({ length: 65_536 }, () => EventJournal.makeEntryIdUnsafe()) as [
            EventJournal.EntryId,
            ...Array<EventJournal.EntryId>
          ],
          iv: new Uint8Array(12),
          encryptedBatch: Uint8Array.of(1)
        }

        const stored = yield* storage.write(publicKey, storeId, [batch])
        const retried = yield* storage.write(publicKey, storeId, [batch])
        const persisted = yield* storage.changes(publicKey, storeId, 0).pipe(Stream.take(1), Stream.runCollect)

        assert.deepStrictEqual(ids(stored), ids([batch]))
        assert.deepStrictEqual(retried, [])
        assert.deepStrictEqual(ids(persisted), ids([batch]))
        assert.strictEqual(persisted[0].sequence, stored[0].sequence)
      }), { timeout: 60_000 })

    it.effect("stores a competing write after its writer retries", () =>
      Effect.gen(function*() {
        const [a, b] = [EventJournal.makeEntryIdUnsafe(), EventJournal.makeEntryIdUnsafe()]
        const { persisted, stored } = yield* competingWrites(makeBatch(a), makeBatch(b))

        assert.deepStrictEqual(ids(stored), ids([makeBatch(b)]))
        assert.deepStrictEqual(ids(persisted), ids([makeBatch(a), makeBatch(b)]))
        assert.deepStrictEqual(persisted.map((batch) => batch.sequence), [
          persisted[0].sequence,
          persisted[0].sequence + 1
        ])
      }))

    it.effect("stores a competing partly known batch whole, once", () =>
      Effect.gen(function*() {
        const [a, b] = [EventJournal.makeEntryIdUnsafe(), EventJournal.makeEntryIdUnsafe()]
        const { persisted, stored } = yield* competingWrites(makeBatch(a), makeBatch(b, a))

        assert.deepStrictEqual(ids(stored), ids([makeBatch(b, a)]))
        assert.deepStrictEqual(ids(persisted), ids([makeBatch(a), makeBatch(b, a)]))
        assert.deepStrictEqual(persisted.map((batch) => batch.sequence), [
          persisted[0].sequence,
          persisted[0].sequence + 1
        ])
      }))
  })
