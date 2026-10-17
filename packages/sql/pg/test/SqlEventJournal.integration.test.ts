import { PgClient } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Option, Redacted } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as SqlEventJournal from "effect/eventlog/SqlEventJournal"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import * as Crypto from "node:crypto"
import { PgContainer, realSleep } from "./utils.ts"

const entry = (msecs: number, primaryKey: string) =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event: "Repro",
    primaryKey,
    payload: new Uint8Array()
  }, { disableChecks: true })

const localEntry = (primaryKey: string) => ({ event: "Repro", primaryKey, payload: new Uint8Array() })

const uploadIds = (journal: EventJournal.EventJournal["Service"], remoteId: EventJournal.RemoteId) =>
  journal.withRemoteUncommited(remoteId, (entries) => Effect.succeed(entries.map((entry) => entry.idString)))

// Creates the schema of the first SqlEventJournal release and inserts entries into it.
const createLegacyJournal = (
  options: { readonly entryTable: string; readonly remotesTable: string },
  entries: ReadonlyArray<EventJournal.Entry>
) =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    yield* sql`
      CREATE TABLE ${sql(options.entryTable)} (
        id BYTEA PRIMARY KEY,
        event TEXT NOT NULL,
        primary_key TEXT NOT NULL,
        payload BYTEA NOT NULL,
        timestamp BIGINT NOT NULL
      )`
    yield* sql`
      CREATE TABLE ${sql(options.remotesTable)} (
        remote_id BYTEA NOT NULL,
        entry_id BYTEA NOT NULL,
        sequence INT NOT NULL,
        PRIMARY KEY (remote_id, entry_id)
      )`
    for (const { event, id, primaryKey, payload, createdAtMillis } of entries) {
      yield* sql`INSERT INTO ${sql(options.entryTable)} ${
        sql.insert({ id, event, primary_key: primaryKey, payload, timestamp: createdAtMillis })
      }`
    }
  })

// Waits, for at most two seconds, until `count` backends are waiting on locks
// or `settled` holds. Timing out only weakens a test, it never fails one.
const waitForLockWaiters = (count: number, settled: () => boolean = () => false) =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    for (let i = 0; i < 200 && !settled(); i++) {
      const [{ waiting }] = yield* sql<{ waiting: number }>`
        SELECT count(*)::int4 AS waiting FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'
      `
      if (waiting >= count) return
      yield* realSleep
    }
  })

// The container is shared with the client, so tests can open more connections.
const TestLayer = Layer.merge(PgContainer.layerClient, PgContainer.layer)

it.layer(TestLayer, { timeout: "30 seconds" })("SqlEventJournal", (it) => {
  it.effect("round-trips a local entry", () =>
    Effect.gen(function*() {
      const journal = yield* SqlEventJournal.make({
        entryTable: "local_entries",
        remotesTable: "local_remotes"
      })
      const written = yield* journal.write({
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1]),
        effect: (entry) => Effect.succeed(entry)
      })
      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].idString, written.idString)
      assert.strictEqual(entries[0].event, "UserCreated")
      assert.strictEqual(entries[0].primaryKey, "user-1")
      assert.deepStrictEqual(entries[0].payload, new Uint8Array([1]))
      assert.strictEqual(entries[0].createdAtMillis, written.createdAtMillis)
    }))

  it.effect("round-trips a remote entry and advances its sequence", () =>
    Effect.gen(function*() {
      const journal = yield* SqlEventJournal.make({
        entryTable: "remote_entries",
        remotesTable: "remote_remotes"
      })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const remoteEntry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe({ msecs: 1_700_000_000_000 }),
        event: "UserCreated",
        primaryKey: "user-2",
        payload: new Uint8Array([2])
      }, { disableChecks: true })
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 0)
      yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: remoteEntry })],
        effect: () => Effect.void
      })

      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].idString, remoteEntry.idString)
      assert.strictEqual(entries[0].event, "UserCreated")
      assert.strictEqual(entries[0].primaryKey, "user-2")
      assert.deepStrictEqual(entries[0].payload, new Uint8Array([2]))
      assert.strictEqual(entries[0].createdAtMillis, 1_700_000_000_000)
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 1)
    }))

  it.effect("withRemoteUncommited uploads each entry once, retries failures and forwards older imports", () =>
    Effect.gen(function*() {
      const journal = yield* SqlEventJournal.make({
        entryTable: "checkpoint_entries",
        remotesTable: "checkpoint_remotes"
      })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const a = yield* journal.write({ ...localEntry("a"), effect: Effect.succeed })
      const failed = yield* Effect.exit(journal.withRemoteUncommited(remoteId, () => Effect.fail("upload failed")))
      const retried = yield* uploadIds(journal, remoteId)
      const b = yield* journal.write({ ...localEntry("b"), effect: Effect.succeed })
      const next = yield* uploadIds(journal, remoteId)
      const older = entry(a.createdAtMillis - 1, "older")
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: older })],
        effect: () => Effect.void
      })
      const forwarded = yield* uploadIds(journal, remoteId)
      const idle = yield* uploadIds(journal, remoteId)
      assert.deepStrictEqual({ failed: Exit.isFailure(failed), retried, next, forwarded, idle }, {
        failed: true,
        retried: Option.some([a.idString]),
        next: Option.some([b.idString]),
        forwarded: Option.some([older.idString]),
        idle: Option.none()
      })
    }))

  it.effect("withRemoteUncommited uploads entries whose commits finish out of order", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const journal = yield* SqlEventJournal.make({
        entryTable: "concurrent_entries",
        remotesTable: "concurrent_remotes"
      })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const written = yield* Deferred.make<EventJournal.Entry>()
      const release = yield* Deferred.make<void>()
      // The first write stays uncommitted until released.
      const first = yield* journal.write({ ...localEntry("first"), effect: Effect.succeed }).pipe(
        Effect.tap((entry) => Deferred.succeed(written, entry)),
        Effect.tap(Deferred.await(release)),
        sql.withTransaction,
        Effect.forkChild
      )
      yield* Deferred.await(written)
      const second = yield* Effect.forkChild(journal.write({ ...localEntry("second"), effect: Effect.succeed }))
      // Upload once the second write has committed or is waiting on a lock.
      yield* waitForLockWaiters(1, () => second.pollUnsafe() !== undefined)
      const beforeCommit = yield* uploadIds(journal, remoteId)
      yield* Deferred.succeed(release, undefined)
      const ids = [(yield* Fiber.join(first)).idString, (yield* Fiber.join(second)).idString]
      const afterCommit = yield* uploadIds(journal, remoteId)
      const uploaded = [...Option.getOrElse(beforeCommit, () => []), ...Option.getOrElse(afterCommit, () => [])]
      assert.deepStrictEqual(uploaded.sort(), ids.sort())
    }))

  it.effect("migrates a legacy database once and reopens it read-only", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const container = yield* PgContainer
      const readonly = yield* PgClient.make({
        url: Redacted.make(container.getConnectionUri()),
        startupParameters: { default_transaction_read_only: "on" }
      })
      const options = { entryTable: "legacy_entries", remotesTable: "legacy_remotes" }
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const local = entry(1000, "local")
      const imported = entry(2000, "imported")
      yield* createLegacyJournal(options, [local, imported])
      yield* sql`INSERT INTO legacy_remotes ${sql.insert({ remote_id: remoteId, entry_id: imported.id, sequence: 0 })}`

      const readonlyLegacy = yield* Effect.exit(
        SqlEventJournal.make(options).pipe(Effect.provideService(SqlClient.SqlClient, readonly))
      )
      yield* SqlEventJournal.make(options)
      const journal = yield* SqlEventJournal.make(options)
      const legacy = yield* uploadIds(journal, remoteId)
      const written = yield* journal.write({ ...localEntry("written"), effect: Effect.succeed })
      const next = yield* uploadIds(journal, remoteId)
      const otherRemote = yield* uploadIds(journal, EventJournal.makeRemoteIdUnsafe())
      const reopened = yield* SqlEventJournal.make(options).pipe(Effect.provideService(SqlClient.SqlClient, readonly))
      assert.deepStrictEqual({
        readonlyLegacy: Exit.isFailure(readonlyLegacy),
        legacy,
        next,
        otherRemote,
        reopened: {
          entries: (yield* reopened.entries).map((entry) => entry.idString),
          sequence: yield* reopened.nextRemoteSequence(remoteId)
        }
      }, {
        readonlyLegacy: true,
        legacy: Option.some([local.idString]),
        next: Option.some([written.idString]),
        otherRemote: Option.some([local.idString, imported.idString, written.idString]),
        reopened: {
          entries: [local.idString, imported.idString, written.idString],
          sequence: 1
        }
      })
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("migrates and writes entries with primary keys beyond the PostgreSQL index tuple limit", () =>
    Effect.gen(function*() {
      const options = { entryTable: "long_key_entries", remotesTable: "long_key_remotes" }
      // Random text barely compresses, so these keys stay well above the ~2.7 KB B-tree tuple limit.
      const longKey = () => Crypto.randomBytes(6000).toString("base64")
      const legacy = entry(1000, longKey())
      yield* createLegacyJournal(options, [legacy])
      const journal = yield* SqlEventJournal.make(options)
      const written = yield* journal.write({ ...localEntry(longKey()), effect: Effect.succeed })
      const older = entry(written.createdAtMillis - 1, written.primaryKey)
      const conflicts: Array<string> = []
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: older })],
        effect: (batch) =>
          Effect.sync(() => {
            for (const { conflicts: stored } of batch) conflicts.push(...stored.map((entry) => entry.idString))
          })
      })
      assert.deepStrictEqual({
        entries: (yield* journal.entries).map((entry) => entry.idString),
        conflicts
      }, {
        entries: [legacy.idString, older.idString, written.idString],
        conflicts: [written.idString]
      })
    }))

  it.effect("concurrent opens migrate a legacy database once", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const options = { entryTable: "concurrent_open_entries", remotesTable: "concurrent_open_remotes" }
      const legacy = entry(1000, "legacy")
      yield* createLegacyJournal(options, [legacy])
      const locked = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      // Index creation needs this table, so both opens stall mid-migration.
      const blocker = yield* sql`LOCK TABLE concurrent_open_entries IN ACCESS EXCLUSIVE MODE`.pipe(
        Effect.andThen(Deferred.succeed(locked, undefined)),
        Effect.andThen(Deferred.await(release)),
        sql.withTransaction,
        Effect.forkChild
      )
      yield* Deferred.await(locked)
      const opens = yield* Effect.forkChild(
        Effect.all([SqlEventJournal.make(options), SqlEventJournal.make(options)], { concurrency: 2 })
      )
      yield* waitForLockWaiters(2)
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(blocker)
      const [, journal] = yield* Fiber.join(opens)
      assert.deepStrictEqual((yield* journal.entries).map((entry) => entry.idString), [legacy.idString])
    }))

  it.effect("an outer transaction can import an entry that another remote is importing", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const journal = yield* SqlEventJournal.make({
        entryTable: "overlapping_entries",
        remotesTable: "overlapping_remotes"
      })
      const a = entry(1000, "a")
      const b = entry(2000, "b")
      const importEntry = (remoteId: EventJournal.RemoteId, entry: EventJournal.Entry) =>
        journal.writeFromRemote({
          remoteId,
          entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry })],
          effect: () => Effect.void
        })
      const imported = yield* Deferred.make<void>()
      const proceed = yield* Deferred.make<void>()
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const outer = yield* importEntry(remoteId, a).pipe(
        Effect.andThen(Deferred.succeed(imported, undefined)),
        Effect.andThen(Deferred.await(proceed)),
        Effect.andThen(importEntry(remoteId, b)),
        sql.withTransaction,
        Effect.forkChild
      )
      yield* Deferred.await(imported)
      const other = yield* Effect.forkChild(importEntry(EventJournal.makeRemoteIdUnsafe(), b))
      // Continue the outer transaction once the other import is waiting on it.
      yield* waitForLockWaiters(1, () => other.pollUnsafe() !== undefined)
      yield* Deferred.succeed(proceed, undefined)
      yield* Fiber.join(outer)
      yield* Fiber.join(other)
      assert.deepStrictEqual((yield* journal.entries).map((entry) => entry.idString), [a.idString, b.idString])
    }))
})
