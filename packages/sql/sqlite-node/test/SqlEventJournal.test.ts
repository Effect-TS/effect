import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, FileSystem, Layer, Option, PubSub, Queue, Schema } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as SqlEventJournal from "effect/eventlog/SqlEventJournal"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import * as SqlError from "effect/sql/SqlError"
import { TestClock } from "effect/testing"

const makeJournal = Effect.gen(function*() {
  const sql = yield* SqliteClient.make({ filename: ":memory:" })
  return yield* SqlEventJournal.make().pipe(
    Effect.provideService(SqlClient.SqlClient, sql)
  )
}).pipe(Effect.provide(Reactivity.layer))

const entry = (msecs: number, event = "Repro", primaryKey = "key") =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event,
    primaryKey,
    payload: new Uint8Array()
  }, { disableChecks: true })

const localEntry = (primaryKey: string) => ({ event: "Repro", primaryKey, payload: new Uint8Array() })

const remoteEntries = (entries: ReadonlyArray<EventJournal.Entry>) =>
  entries.map((entry, remoteSequence) => new EventJournal.RemoteEntry({ remoteSequence, entry }))

describe("SqlEventJournal", () => {
  it.effect("replay invalidation observes committed entries from another connection", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const filename = directory + "/journal.db"
      const writer = yield* SqliteClient.make({ filename })
      const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, writer))
      const reader = yield* SqliteClient.make({ filename, readonly: true })
      // A separate connection cannot see the replay transaction's uncommitted rows.
      const readJournal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, reader))
      const group = EventGroup.empty.add({
        tag: "UserCreated",
        primaryKey: (payload) => payload.id,
        payload: Schema.Struct({ id: Schema.String })
      })
      const handlers = EventLog.group(group, (handlers) => handlers.handle("UserCreated", () => Effect.void)).pipe(
        Layer.merge(EventLog.groupReactivity(group, ["users"])),
        Layer.provide(EventLog.layerRegistry)
      )
      const layer = EventLog.layer(EventLog.schema(group), handlers).pipe(
        Layer.provide(Layer.succeed(EventJournal.EventJournal, journal)),
        Layer.provide(
          Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(
            Layer.provide(EventLogEncryption.layerSubtle)
          )
        )
      )
      const reactivity = yield* Reactivity.Reactivity
      const results = yield* reactivity.query(["users"], readJournal.entries)
      assert.deepStrictEqual(yield* Queue.take(results), [])
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-1",
        payload: yield* Schema.encodeUnknownEffect(group.events.UserCreated.payloadSchemaBinary)({ id: "user-1" })
      }, { disableChecks: true })
      const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
      yield* Queue.offer(changes, new EventJournal.RemoteEntry({ remoteSequence: 0, entry }))
      yield* Effect.gen(function*() {
        const registry = yield* EventLog.Registry
        yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
          id: EventJournal.makeRemoteIdUnsafe(),
          changes: () => Effect.succeed(changes),
          write: () => Effect.void,
          whenAuthenticated: (effect) => effect
        }))
        assert.deepStrictEqual((yield* Queue.take(results)).map((entry) => entry.idString), [entry.idString])
      }).pipe(Effect.provide(layer))
    }).pipe(Effect.provide([NodeFileSystem.layer, Reactivity.layer])))

  it.effect("rolls back a failed same-client handler transaction with the journal and redelivers the batch", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      yield* sql`CREATE TABLE projection (id TEXT PRIMARY KEY)`
      const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, sql))
      const group = EventGroup.empty.add({
        tag: "UserCreated",
        primaryKey: (payload) => payload.id,
        payload: Schema.Struct({ id: Schema.String })
      })
      const handlers = EventLog.group(group, (handlers) =>
        handlers.handle("UserCreated", ({ payload }) =>
          // The primary key turns a missing rollback into a failed redelivery.
          sql`INSERT INTO projection (id) VALUES (${payload.id})`.pipe(Effect.orDie))).pipe(
          Layer.merge(EventLog.groupReactivity(group, ["users"])),
          Layer.provide(EventLog.layerRegistry)
        )
      let attempts = 0
      const layer = EventLog.layer(EventLog.schema(group), handlers).pipe(
        Layer.provide([
          Layer.succeed(EventJournal.EventJournal, journal),
          Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(Layer.provide(EventLogEncryption.layerSubtle)),
          Layer.succeed(EventLog.HandlerTransaction, (effect) =>
            sql.withTransaction(effect).pipe(
              Effect.catchIf(SqlError.isSqlError, Effect.die),
              // Abort the first attempt after the handler transaction completes,
              // so only the enclosing journal transaction can roll it back.
              Effect.tap(() => attempts++ === 0 ? Effect.die("aborted") : Effect.void)
            ))
        ])
      )
      const reactivity = yield* Reactivity.Reactivity
      // Queries re-run after the replay releases the journal lock and transaction.
      const results = yield* reactivity.query(
        ["users"],
        Effect.all({
          projection: sql<{ id: string }>`SELECT id FROM projection ORDER BY id`.pipe(
            Effect.map((rows) => rows.map((row) => row.id))
          ),
          journal: Effect.map(journal.entries, (entries) => entries.map((entry) => entry.primaryKey))
        })
      )
      assert.deepStrictEqual(yield* Queue.take(results), { projection: [], journal: [] })
      const encode = Schema.encodeUnknownEffect(group.events.UserCreated.payloadSchemaBinary)
      const entries: Array<EventJournal.RemoteEntry> = []
      for (const id of ["user-1", "user-2"]) {
        entries.push(
          new EventJournal.RemoteEntry({
            remoteSequence: entries.length,
            entry: new EventJournal.Entry({
              id: EventJournal.makeEntryIdUnsafe(),
              event: "UserCreated",
              primaryKey: id,
              payload: yield* encode({ id })
            }, { disableChecks: true })
          })
        )
      }
      yield* Effect.gen(function*() {
        const registry = yield* EventLog.Registry
        yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
          id: EventJournal.makeRemoteIdUnsafe(),
          // Every subscription redelivers from the requested sequence.
          changes: ({ startSequence }) =>
            Effect.tap(
              Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>(),
              (queue) => Queue.offerAll(queue, entries.filter((entry) => entry.remoteSequence >= startSequence))
            ),
          write: () => Effect.void,
          whenAuthenticated: (effect) => effect
        }))
        const afterFailure = yield* Queue.take(results)
        yield* TestClock.adjust("200 millis")
        const afterRedelivery = yield* Queue.take(results)
        assert.deepStrictEqual({ afterFailure, afterRedelivery, attempts }, {
          afterFailure: { projection: [], journal: [] },
          afterRedelivery: { projection: ["user-1", "user-2"], journal: ["user-1", "user-2"] },
          attempts: 2
        })
      }).pipe(Effect.provide(layer))
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("replays each remote batch in one callback with strictly newer same-event-and-key conflicts", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const newer = entry(2000)
      const otherEvent = entry(3000, "Other")
      const otherKey = entry(3000, "Repro", "other")
      const older = entry(1000)
      const sameBatch = entry(1500)
      const sameMillis = entry(2000)
      const batches: Array<
        ReadonlyArray<{ readonly entry: EventJournal.Entry; readonly conflicts: ReadonlyArray<EventJournal.Entry> }>
      > = []
      const writeBatch = (entries: ReadonlyArray<EventJournal.Entry>) =>
        journal.writeFromRemote({
          remoteId: EventJournal.makeRemoteIdUnsafe(),
          entries: remoteEntries(entries),
          effect: (batch) =>
            Effect.sync(() => {
              batches.push(batch)
            })
        })
      yield* writeBatch([newer, otherEvent, otherKey])
      yield* writeBatch([older, sameBatch, sameMillis])

      assert.strictEqual(batches.length, 2)
      // Conflicts exclude the incoming batch, equal timestamps, and other
      // event/key pairs.
      assert.deepStrictEqual(
        batches.map((batch) => batch.map(({ conflicts, entry }) => [entry.idString, conflicts.map((c) => c.idString)])),
        [
          [[newer.idString, []], [otherEvent.idString, []], [otherKey.idString, []]],
          [
            [older.idString, [newer.idString]],
            [sameBatch.idString, [newer.idString]],
            [sameMillis.idString, []]
          ]
        ]
      )
    }))

  it.effect("journal queries use indexes", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, sql))
      const plan = (query: string) =>
        sql.unsafe<{ detail: string }>(`EXPLAIN QUERY PLAN ${query}`).pipe(
          Effect.map((rows) => rows.map((row) => row.detail.replace(/INDEX \S+/, "INDEX <index>")))
        )
      assert.deepStrictEqual({
        conflicts: yield* plan(
          "SELECT * FROM effect_event_journal WHERE event IN ('a', 'b') AND primary_key IN ('a', 'b') AND timestamp > 0"
        ),
        entries: yield* plan("SELECT * FROM effect_event_journal ORDER BY timestamp ASC"),
        nextRemoteSequence: yield* plan("SELECT MAX(sequence) FROM effect_event_remotes WHERE remote_id = x'00'")
      }, {
        conflicts: ["SEARCH effect_event_journal USING INDEX <index> (event=? AND primary_key=? AND timestamp>?)"],
        entries: ["SCAN effect_event_journal USING INDEX <index>"],
        nextRemoteSequence: ["SEARCH effect_event_remotes USING COVERING INDEX <index> (remote_id=?)"]
      })
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("opens and keeps working on a database created before upload checkpoints", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      // The schema as created by the first release of SqlEventJournal.
      yield* sql`
        CREATE TABLE effect_event_journal (
          id BLOB PRIMARY KEY,
          event TEXT NOT NULL,
          primary_key TEXT NOT NULL,
          payload BLOB NOT NULL,
          timestamp INTEGER NOT NULL
        )`
      yield* sql`
        CREATE TABLE effect_event_remotes (
          remote_id BLOB NOT NULL,
          entry_id BLOB NOT NULL,
          sequence INT NOT NULL,
          PRIMARY KEY (remote_id, entry_id)
        )`
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const local = entry(1000, "Repro", "local")
      const imported = entry(2000, "Repro", "imported")
      for (const { event, id, primaryKey, payload, createdAtMillis } of [local, imported]) {
        yield* sql`INSERT INTO effect_event_journal ${
          sql.insert({ id, event, primary_key: primaryKey, payload, timestamp: createdAtMillis })
        }`
      }
      yield* sql`INSERT INTO effect_event_remotes ${
        sql.insert({ remote_id: remoteId, entry_id: imported.id, sequence: 0 })
      }`

      const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, sql))
      const upload = (remoteId: EventJournal.RemoteId) =>
        journal.withRemoteUncommited(remoteId, (entries) => Effect.succeed(entries.map((entry) => entry.idString)))
      assert.deepStrictEqual({
        remote: yield* upload(remoteId),
        otherRemote: yield* upload(EventJournal.makeRemoteIdUnsafe())
      }, {
        remote: Option.some([local.idString]),
        otherRemote: Option.some([local.idString, imported.idString])
      })
    }).pipe(Effect.provide(Reactivity.layer)))

  for (const [name, make] of [["SQL", makeJournal], ["memory", EventJournal.makeMemory]] as const) {
    describe(name, () => {
      it.effect("withRemoteUncommited uploads each entry once, retries failures and forwards older imports", () =>
        Effect.gen(function*() {
          const journal = yield* make
          const remoteId = EventJournal.makeRemoteIdUnsafe()
          const upload = journal.withRemoteUncommited(
            remoteId,
            (entries) => Effect.succeed(entries.map((entry) => entry.idString))
          )
          const a = yield* journal.write({ ...localEntry("a"), effect: Effect.succeed })
          const failed = yield* Effect.exit(journal.withRemoteUncommited(remoteId, () => Effect.fail("upload failed")))
          const retried = yield* upload
          // No echo from the remote: a successful upload alone must advance it.
          const b = yield* journal.write({ ...localEntry("b"), effect: Effect.succeed })
          const next = yield* upload
          const older = entry(a.createdAtMillis - 1)
          yield* journal.writeFromRemote({
            remoteId: EventJournal.makeRemoteIdUnsafe(),
            entries: remoteEntries([older]),
            effect: () => Effect.void
          })
          const forwarded = yield* upload
          const idle = yield* upload
          assert.deepStrictEqual({ failed: Exit.isFailure(failed), retried, next, forwarded, idle }, {
            failed: true,
            retried: Option.some([a.idString]),
            next: Option.some([b.idString]),
            forwarded: Option.some([older.idString]),
            idle: Option.none()
          })
        }))

      it.effect("writeMany commits and publishes a batch in order only when its callback succeeds", () =>
        Effect.gen(function*() {
          const journal = yield* make
          const changes = yield* journal.changes
          const entries = [localEntry("a"), localEntry("b"), localEntry("c")] as const
          const failed = yield* Effect.exit(
            journal.writeMany({ entries, effect: () => Effect.fail("callback failed") })
          )
          const afterFailure = {
            failed: Exit.isFailure(failed),
            entries: (yield* journal.entries).length,
            published: yield* PubSub.remaining(changes)
          }
          const written = yield* journal.writeMany({ entries, effect: Effect.succeed })
          const ids = written.map((entry) => entry.idString)
          assert.deepStrictEqual({
            afterFailure,
            keys: written.map((entry) => entry.primaryKey),
            ascending: written.every((entry, i) =>
              i === 0 || EventJournal.EntryIdOrder(written[i - 1].id, entry.id) < 0
            ),
            committed: (yield* journal.entries).map((entry) => entry.idString),
            uncommitted: yield* journal.withRemoteUncommited(
              EventJournal.makeRemoteIdUnsafe(),
              (entries) => Effect.succeed(entries.map((entry) => entry.idString))
            ),
            published: (yield* PubSub.takeAll(changes)).map((entry) => entry.idString)
          }, {
            afterFailure: { failed: true, entries: 0, published: 0 },
            keys: ["a", "b", "c"],
            ascending: true,
            committed: ids,
            uncommitted: Option.some(ids),
            published: ids
          })
        }))

      it.effect("failed remote callbacks persist nothing and allow redelivery", () =>
        Effect.gen(function*() {
          const journal = yield* make
          const remoteId = EventJournal.makeRemoteIdUnsafe()
          const stored = entry(500)
          yield* journal.writeFromRemote({
            remoteId: EventJournal.makeRemoteIdUnsafe(),
            entries: remoteEntries([stored]),
            effect: () => Effect.void
          })
          const added = entry(1000)
          // A new entry followed by an echo of an entry the journal already has.
          const entries = remoteEntries([added, stored])
          const exit = yield* Effect.exit(journal.writeFromRemote({
            remoteId,
            entries,
            effect: () =>
              Effect.fail(
                new EventJournal.EventJournalError({
                  method: "writeFromRemote",
                  cause: "callback failed"
                })
              )
          }))
          assert.isTrue(Exit.isFailure(exit))
          const afterFailure = {
            entries: (yield* journal.entries).map((entry) => entry.idString),
            sequence: yield* journal.nextRemoteSequence(remoteId)
          }
          const retried: Array<string> = []
          yield* journal.writeFromRemote({
            remoteId,
            entries,
            effect: (batch) =>
              Effect.sync(() => {
                for (const { entry } of batch) retried.push(entry.idString)
              })
          })
          assert.deepStrictEqual({ afterFailure, retried }, {
            afterFailure: { entries: [stored.idString], sequence: 0 },
            retried: [added.idString]
          })
          assert.deepStrictEqual((yield* journal.entries).map((entry) => entry.idString), [
            stored.idString,
            added.idString
          ])
          assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 2)
        }))
    })
  }

  it.effect("preserves write callback error identity", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const error = new Error("callback failed")
      const actual = yield* Effect.flip(journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array([1]),
        effect: () => Effect.fail(error)
      }))
      assert.strictEqual(actual, error)
    }))

  it.effect("preserves remote callback error identity", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      yield* journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array([1]),
        effect: () => Effect.void
      })
      const error = new Error("callback failed")
      const actual = yield* Effect.flip(
        journal.withRemoteUncommited(EventJournal.makeRemoteIdUnsafe(), () => Effect.fail(error))
      )
      assert.strictEqual(actual, error)
    }))

  it.effect("commits only after the write callback succeeds", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, sql))
      yield* Effect.exit(journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array([1]),
        effect: () => Effect.fail("callback failed")
      }))
      assert.deepStrictEqual(yield* journal.entries, [])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("writes and reads entries", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      let createdAt = 0
      yield* journal.write({
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1]),
        effect: (entry) =>
          Effect.sync(() => {
            createdAt = entry.createdAtMillis
          })
      })
      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].event, "UserCreated")
      assert.strictEqual(entries[0].createdAtMillis, createdAt)
    }))

  it.effect("writes remote entries and sequences", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const initial = yield* journal.nextRemoteSequence(remoteId)
      assert.strictEqual(initial, 0)

      const entryA = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-2",
        payload: new Uint8Array([2])
      }, { disableChecks: true })
      const entryB = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-3",
        payload: new Uint8Array([3])
      }, { disableChecks: true })
      const remoteEntries = [
        new EventJournal.RemoteEntry({ remoteSequence: 0, entry: entryA }),
        new EventJournal.RemoteEntry({ remoteSequence: 1, entry: entryB })
      ]
      const seenConflicts: Array<ReadonlyArray<EventJournal.Entry>> = []
      yield* journal.writeFromRemote({
        remoteId,
        entries: remoteEntries,
        effect: (batch) =>
          Effect.sync(() => {
            for (const { conflicts } of batch) seenConflicts.push(conflicts)
          })
      })
      const next = yield* journal.nextRemoteSequence(remoteId)
      assert.strictEqual(next, 2)

      let emptyCalls = 0
      const emptyResult = yield* journal.withRemoteUncommited(remoteId, () =>
        Effect.sync(() => {
          emptyCalls++
          return "called"
        }))
      assert.isTrue(Option.isNone(emptyResult))
      assert.strictEqual(emptyCalls, 0)

      yield* journal.write({
        event: "LocalCreated",
        primaryKey: "local-1",
        payload: new Uint8Array([4]),
        effect: () => Effect.void
      })
      let uncommittedCalls = 0
      const uncommitted = yield* journal.withRemoteUncommited(remoteId, (entries) =>
        Effect.sync(() => {
          uncommittedCalls++
          return entries
        }))
      if (Option.isNone(uncommitted)) assert.fail("Expected the callback result")
      assert.strictEqual(uncommitted.value.length, 1)
      assert.strictEqual(uncommitted.value[0].event, "LocalCreated")
      assert.strictEqual(uncommittedCalls, 1)
      assert.deepStrictEqual(seenConflicts, [[], []])
    }))
})
