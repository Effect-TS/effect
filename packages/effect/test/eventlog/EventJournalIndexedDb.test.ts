// oxlint-disable-next-line no-unassigned-import
import "fake-indexeddb/auto"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Option, PubSub } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"

let databaseId = 0
const uniqueName = (prefix: string) => `${prefix}-${databaseId++}`

// `tail` fixes the random id bytes, so entries sharing a millisecond sort in a
// known order by id.
const entry = (
  msecs: number,
  options?: {
    readonly event?: string
    readonly primaryKey?: string
    readonly tail?: number
    readonly payload?: ReadonlyArray<number>
  }
) => {
  const id = EventJournal.makeEntryIdUnsafe({ msecs })
  if (options?.tail !== undefined) id.fill(options.tail, 6)
  return new EventJournal.Entry({
    id,
    event: options?.event ?? "Repro",
    primaryKey: options?.primaryKey ?? "key",
    payload: new Uint8Array(options?.payload ?? [])
  }, { disableChecks: true })
}

const describeEntry = (entry: EventJournal.Entry) =>
  [entry.idString, entry.event, entry.primaryKey, Array.from(entry.payload)] as const

type Batch = ReadonlyArray<
  { readonly entry: EventJournal.Entry; readonly conflicts: ReadonlyArray<EventJournal.Entry> }
>

const describeBatch = (batch: Batch) =>
  batch.map(({ conflicts, entry }) => [entry.idString, conflicts.map(describeEntry)] as const)

const importEntries = (journal: EventJournal.EventJournal["Service"], entries: ReadonlyArray<EventJournal.Entry>) =>
  journal.writeFromRemote({
    remoteId: EventJournal.makeRemoteIdUnsafe(),
    entries: remoteEntries(entries),
    effect: () => Effect.void
  })

// Counts stored entries read from the `entries` store or its indexes, whether
// through a cursor or `getAll`.
const countEntryReads = (database: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const reads = { count: 0 }
      const isEntries = (source: IDBObjectStore | IDBIndex) => {
        const store = "objectStore" in source ? source.objectStore : source
        return store.transaction.db.name === database && store.name === "entries"
      }
      const patch = (target: IDBObjectStore | IDBIndex, method: "openCursor" | "getAll") => {
        const original = (target as any)[method]
        ;(target as any)[method] = function(this: IDBObjectStore | IDBIndex, ...args: Array<unknown>) {
          const request: IDBRequest = original.apply(this, args)
          if (isEntries(this)) {
            request.addEventListener("success", () => {
              const result = request.result
              if (method === "getAll") reads.count += (result as Array<unknown>).length
              else if (result) reads.count++
            })
          }
          return request
        }
        return () => {
          ;(target as any)[method] = original
        }
      }
      const restore = [
        patch(IDBObjectStore.prototype, "openCursor"),
        patch(IDBObjectStore.prototype, "getAll"),
        patch(IDBIndex.prototype, "openCursor"),
        patch(IDBIndex.prototype, "getAll")
      ]
      return { reads, restore }
    }),
    ({ restore }) =>
      Effect.sync(() => {
        for (const f of restore) f()
      })
  ).pipe(Effect.map(({ reads }) => reads))

const idbRequest = <A>(request: IDBRequest<A>) =>
  Effect.callback<A, unknown>((resume) => {
    request.onsuccess = () => resume(Effect.succeed(request.result))
    request.onerror = () => resume(Effect.fail(request.error))
  })

const transactionDone = (tx: IDBTransaction) =>
  Effect.callback<void, unknown>((resume) => {
    tx.oncomplete = () => resume(Effect.void)
    tx.onerror = tx.onabort = () => resume(Effect.fail(tx.error))
  })

// Creates a database with the version 2 schema written by `makeIndexedDb`
// before the conflict index was added.
const openVersion2 = (database: string) => {
  const request = indexedDB.open(database, 2)
  request.onupgradeneeded = () => {
    const db = request.result
    const entries = db.createObjectStore("entries", { keyPath: "id" })
    entries.createIndex("id", "id", { unique: true })
    entries.createIndex("event", "event")
    const remotes = db.createObjectStore("remotes", { keyPath: ["remoteId", "entryId"] })
    remotes.createIndex("id", ["remoteId", "entryId"], { unique: true })
    remotes.createIndex("sequence", ["remoteId", "sequence"], { unique: true })
    const remoteEntryId = db.createObjectStore("remoteEntryId", { keyPath: ["remoteId"] })
    remoteEntryId.createIndex("id", "remoteId", { unique: true })
    db.createObjectStore("entrySequence", { autoIncrement: true })
  }
  return idbRequest(request)
}

const remoteEntries = (entries: ReadonlyArray<EventJournal.Entry>) =>
  entries.map((entry, remoteSequence) => new EventJournal.RemoteEntry({ remoteSequence, entry }))

const countTransactions = (database: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const transactions = { opened: 0 }
      const original = IDBDatabase.prototype.transaction
      IDBDatabase.prototype.transaction = function(this: IDBDatabase, storeNames, mode, options) {
        if (this.name === database) transactions.opened++
        return original.call(this, storeNames, mode, options)
      }
      return { transactions, original }
    }),
    ({ original }) =>
      Effect.sync(() => {
        IDBDatabase.prototype.transaction = original
      })
  ).pipe(Effect.map(({ transactions }) => transactions))

describe("EventJournal.makeIndexedDb", () => {
  it.effect("deduplicates overlapping remote entries within one incoming array", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const a = entry(1_000)
      const b = entry(2_000)
      const handled: Array<string> = []
      // Flattened overlapping batches [A] and [A, B], not separate journal writes.
      const repeatedA = new EventJournal.Entry({ ...a, id: a.id.slice() as EventJournal.EntryId })
      yield* journal.writeFromRemote({
        remoteId,
        entries: [a, repeatedA, b].map((entry, remoteSequence) =>
          new EventJournal.RemoteEntry({ remoteSequence, entry })
        ),
        effect: (batch) =>
          Effect.sync(() => {
            handled.push(...batch.map(({ entry }) => entry.idString))
          })
      })

      assert.deepStrictEqual({
        handled,
        stored: (yield* journal.entries).map((entry) => entry.idString),
        nextSequence: yield* journal.nextRemoteSequence(remoteId)
      }, {
        handled: [a.idString, b.idString],
        stored: [a.idString, b.idString],
        nextSequence: 3
      })
    }))

  it.effect("advances remote progress past a trailing known entry in a partly known batch", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const a = entry(1_000)
      const b = entry(2_000)
      const handled: Array<string> = []
      const effect = (batch: ReadonlyArray<{ readonly entry: EventJournal.Entry }>) =>
        Effect.sync(() => {
          handled.push(...batch.map(({ entry }) => entry.idString))
        })
      yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: a })],
        effect
      })
      yield* journal.writeFromRemote({
        remoteId,
        entries: [
          new EventJournal.RemoteEntry({ remoteSequence: 1, entry: b }),
          new EventJournal.RemoteEntry({ remoteSequence: 2, entry: a })
        ],
        effect
      })

      assert.deepStrictEqual({
        handled,
        stored: (yield* journal.entries).map((entry) => entry.idString),
        nextSequence: yield* journal.nextRemoteSequence(remoteId)
      }, {
        handled: [a.idString, b.idString],
        stored: [a.idString, b.idString],
        nextSequence: 3
      })
    }))
  it.effect("withRemoteUncommited does not resend entries after a successful callback without a remote echo", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      yield* journal.write({
        event: "Repro",
        primaryKey: "a",
        payload: new Uint8Array(),
        effect: Effect.succeed
      })
      yield* journal.withRemoteUncommited(remoteId, () => Effect.void)

      const b = yield* journal.write({
        event: "Repro",
        primaryKey: "b",
        payload: new Uint8Array(),
        effect: Effect.succeed
      })
      const second = yield* journal.withRemoteUncommited(
        remoteId,
        (entries) => Effect.succeed(entries.map((entry) => entry.idString))
      )
      assert.deepStrictEqual(second, Option.some([b.idString]))
    }))

  it.effect("withRemoteUncommited forwards older entries imported after a successful upload", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const local = yield* journal.write({
        event: "Repro",
        primaryKey: "local",
        payload: new Uint8Array(),
        effect: Effect.succeed
      })
      yield* journal.withRemoteUncommited(remoteId, () => Effect.void)

      const older = entry(local.createdAtMillis - 1)
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([older]),
        effect: () => Effect.void
      })
      const forwarded = yield* journal.withRemoteUncommited(
        remoteId,
        (entries) => Effect.succeed(entries.map((entry) => entry.idString))
      )
      assert.deepStrictEqual(forwarded, Option.some([older.idString]))
    }))

  it.effect("writeMany commits and publishes a batch in one transaction only when its callback succeeds", () =>
    Effect.gen(function*() {
      const database = uniqueName("journal")
      const journal = yield* EventJournal.makeIndexedDb({ database })
      const changes = yield* journal.changes
      const transactions = yield* countTransactions(database)
      const local = (primaryKey: string) => ({ event: "Repro", primaryKey, payload: new Uint8Array() })
      const entries = [local("a"), local("b"), local("c")] as const
      const failed = yield* Effect.exit(journal.writeMany({ entries, effect: () => Effect.fail("callback failed") }))
      const afterFailure = {
        failed: Exit.isFailure(failed),
        transactions: transactions.opened,
        published: yield* PubSub.remaining(changes)
      }
      const written = yield* journal.writeMany({ entries, effect: Effect.succeed })
      const ids = written.map((entry) => entry.idString)
      assert.deepStrictEqual({
        afterFailure,
        transactions: transactions.opened,
        committed: (yield* journal.entries).map((entry) => entry.idString),
        published: (yield* PubSub.takeAll(changes)).map((entry) => entry.idString)
      }, {
        afterFailure: { failed: true, transactions: 0, published: 0 },
        transactions: 1,
        committed: ids,
        published: ids
      })
    }))

  it.live("writeMany fails when its transaction aborts after the puts succeed", () =>
    Effect.gen(function*() {
      const database = uniqueName("journal")
      const journal = yield* EventJournal.makeIndexedDb({ database })
      const changes = yield* journal.changes
      // Abort once the put has succeeded and no request is pending, so the
      // transaction dispatches `abort` without an `error` event, as a failed
      // commit would.
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const put = IDBObjectStore.prototype.put
          IDBObjectStore.prototype.put = function(this: IDBObjectStore, value, key) {
            const request = put.call(this, value, key)
            if (this.transaction.db.name === database) {
              request.addEventListener("success", () => this.transaction.abort())
            }
            return request
          }
          return put
        }),
        (put) =>
          Effect.sync(() => {
            IDBObjectStore.prototype.put = put
          })
      )
      const write = yield* journal.writeMany({
        entries: [{ event: "Repro", primaryKey: "a", payload: new Uint8Array() }],
        effect: Effect.succeed
      }).pipe(Effect.flip, Effect.forkDetach)
      // The commit is uninterruptible, so bound the wait without interrupting it.
      const error = yield* Fiber.join(write).pipe(Effect.timeoutOption("2 seconds"))
      assert.deepStrictEqual({
        failed: Option.map(error, (error) => (error as EventJournal.EventJournalError)._tag),
        committed: (yield* journal.entries).length,
        published: yield* PubSub.remaining(changes)
      }, {
        failed: Option.some("EventJournalError"),
        committed: 0,
        published: 0
      })
    }))

  it.effect("replays a remote batch in one callback without journal transactions while it runs", () =>
    Effect.gen(function*() {
      const journalName = uniqueName("journal")
      const journal = yield* EventJournal.makeIndexedDb({ database: journalName })

      const newer = entry(2000, { tail: 0xff })
      const otherEvent = entry(3000, { event: "Other" })
      const otherKey = entry(3000, { primaryKey: "other" })
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([newer, otherEvent, otherKey]),
        effect: () => Effect.void
      })

      const transactions = yield* countTransactions(journalName)
      const batches: Array<
        ReadonlyArray<{ readonly entry: EventJournal.Entry; readonly conflicts: ReadonlyArray<EventJournal.Entry> }>
      > = []
      const older = entry(1000)
      const sameBatch = entry(1500)
      const sameMillis = entry(2000, { tail: 0x00 })
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([older, sameBatch, sameMillis]),
        effect: (batch) =>
          Effect.gen(function*() {
            const before = transactions.opened
            batches.push(batch)
            // Give pending journal requests a turn, as a projection transaction would.
            yield* Effect.yieldNow
            assert.strictEqual(transactions.opened, before)
          })
      })
      assert.deepStrictEqual(
        batches.map((batch) => batch.map(({ conflicts, entry }) => [entry.idString, conflicts.map((c) => c.idString)])),
        [[
          [older.idString, [newer.idString]],
          [sameBatch.idString, [newer.idString]],
          [sameMillis.idString, []]
        ]]
      )
      // Duplicate check, conflicts, commit.
      assert.strictEqual(transactions.opened, 3)
    }))

  it.effect("failed remote callbacks persist nothing and allow redelivery", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
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
      const failed = yield* Effect.exit(journal.writeFromRemote({
        remoteId,
        entries,
        effect: () => Effect.fail(new EventJournal.EventJournalError({ method: "writeFromRemote", cause: "failed" }))
      }))
      const afterFailure = {
        failed: failed._tag === "Failure",
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
      assert.deepStrictEqual({
        afterFailure,
        retried,
        entries: (yield* journal.entries).map((entry) => entry.idString),
        sequence: yield* journal.nextRemoteSequence(remoteId)
      }, {
        afterFailure: { failed: true, entries: [stored.idString], sequence: 0 },
        retried: [added.idString],
        entries: [stored.idString, added.idString],
        sequence: 2
      })
    }))

  it.effect("reports conflicts in entry id order for each event and primary key", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const newest = entry(3000, { tail: 0x10, payload: [3] })
      const otherEvent = entry(3000, { event: "Other", payload: [4] })
      const otherKey = entry(3000, { primaryKey: "other", payload: [5] })
      // Imported after `newest`, so insertion order differs from id order.
      const sameMillisHigh = entry(2000, { tail: 0x20, payload: [2] })
      const sameMillisLow = entry(2000, { tail: 0x01, payload: [1] })
      const oldest = entry(500, { payload: [0] })
      yield* importEntries(journal, [newest, otherEvent, otherKey])
      yield* importEntries(journal, [sameMillisHigh, sameMillisLow, oldest])

      const older = entry(1000)
      const equalMillis = entry(2000, { tail: 0x05 })
      const crossed = entry(1000, { event: "Other", primaryKey: "other" })
      const otherEventOlder = entry(2500, { event: "Other" })
      const batches: Array<Batch> = []
      const { duplicateEntries } = yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([newest, older, equalMillis, crossed, otherEventOlder]),
        effect: (batch) => Effect.sync(() => batches.push(batch))
      })
      assert.deepStrictEqual({
        duplicates: duplicateEntries.map((entry) => entry.idString),
        batches: batches.map(describeBatch)
      }, {
        duplicates: [newest.idString],
        batches: [[
          [older.idString, [sameMillisLow, sameMillisHigh, newest].map(describeEntry)],
          [equalMillis.idString, [describeEntry(newest)]],
          [crossed.idString, []],
          [otherEventOlder.idString, [describeEntry(otherEvent)]]
        ]]
      })
    }))

  it.effect("reads only stored entries with the event and primary key of a remote batch", () =>
    Effect.gen(function*() {
      const database = uniqueName("journal")
      const journal = yield* EventJournal.makeIndexedDb({ database })
      const conflicts = [entry(2000), entry(2001), entry(2002)]
      yield* importEntries(journal, [
        entry(500),
        ...conflicts,
        ...Array.from({ length: 20 }, (_, i) => entry(2000 + i, { primaryKey: `other-${i}` })),
        ...Array.from({ length: 5 }, (_, i) => entry(2000 + i, { event: "Other" }))
      ])

      const reads = yield* countEntryReads(database)
      const incoming = entry(1000)
      const batches: Array<Batch> = []
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([incoming]),
        effect: (batch) => Effect.sync(() => batches.push(batch))
      })
      assert.deepStrictEqual({
        reads: reads.count,
        batches: batches.map(describeBatch)
      }, {
        reads: conflicts.length,
        batches: [[[incoming.idString, conflicts.map(describeEntry)]]]
      })
    }))

  it.effect("upgrades a version 2 database to version 3 without losing entries or remote state", () =>
    Effect.gen(function*() {
      const database = uniqueName("journal")
      const source = EventJournal.makeRemoteIdUnsafe()
      const upload = EventJournal.makeRemoteIdUnsafe()
      const stored = [entry(1000, { payload: [1] }), entry(2000, { payload: [2] }), entry(3000, { payload: [3] })]

      const v2 = yield* openVersion2(database)
      const tx = v2.transaction(["entries", "entrySequence", "remotes", "remoteEntryId"], "readwrite")
      for (const item of stored) {
        tx.objectStore("entries").put({
          id: item.id,
          event: item.event,
          primaryKey: item.primaryKey,
          payload: item.payload
        })
        tx.objectStore("entrySequence").add(item.id as IDBValidKey)
      }
      // The first two came from `source`; `upload` has sent the first one.
      stored.slice(0, 2).forEach((item, sequence) =>
        tx.objectStore("remotes").put({ remoteId: source, entryId: item.id, sequence })
      )
      tx.objectStore("remoteEntryId").put({ remoteId: upload, sequence: 1 })
      yield* transactionDone(tx)
      v2.close()

      const journal = yield* EventJournal.makeIndexedDb({ database })
      const entries = (yield* journal.entries).map(describeEntry)
      const nextSequence = yield* journal.nextRemoteSequence(source)
      const uncommitted = yield* journal.withRemoteUncommited(
        upload,
        (entries) => Effect.succeed(entries.map((entry) => entry.idString))
      )
      const batches: Array<Batch> = []
      const incoming = entry(1500)
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([incoming]),
        effect: (batch) => Effect.sync(() => batches.push(batch))
      })

      const upgraded = yield* Effect.acquireRelease(
        idbRequest(indexedDB.open(database)),
        (db) => Effect.sync(() => db.close())
      )
      const store = upgraded.transaction("entries", "readonly").objectStore("entries")
      const keyPaths = Array.from(store.indexNames, (name) => store.index(name).keyPath)
      assert.deepStrictEqual({
        version: upgraded.version,
        conflictIndex: keyPaths.some((keyPath) => Array.isArray(keyPath) && keyPath.join() === "event,primaryKey,id"),
        entries,
        nextSequence,
        uncommitted,
        batches: batches.map(describeBatch)
      }, {
        version: 3,
        conflictIndex: true,
        entries: stored.map(describeEntry),
        nextSequence: 2,
        uncommitted: Option.some([stored[1].idString, stored[2].idString]),
        batches: [[[incoming.idString, stored.slice(1).map(describeEntry)]]]
      })
    }))
})
