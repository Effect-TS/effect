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
  options?: { readonly event?: string; readonly primaryKey?: string; readonly tail?: number }
) => {
  const id = EventJournal.makeEntryIdUnsafe({ msecs })
  if (options?.tail !== undefined) id.fill(options.tail, 6)
  return new EventJournal.Entry({
    id,
    event: options?.event ?? "Repro",
    primaryKey: options?.primaryKey ?? "key",
    payload: new Uint8Array()
  }, { disableChecks: true })
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
  it.effect("withRemoteUncommited does not resend entries after a successful callback without a remote echo", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const a = yield* journal.write({
        event: "Repro",
        primaryKey: "a",
        payload: new Uint8Array(),
        effect: Effect.succeed
      })
      const first = yield* journal.withRemoteUncommited(
        remoteId,
        (entries) => Effect.succeed(entries.map((entry) => entry.idString))
      )
      assert.deepStrictEqual(first, Option.some([a.idString]))

      // No writeFromRemote echo records A as known to this remote.
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
      const uploaded = yield* journal.withRemoteUncommited(
        remoteId,
        (entries) => Effect.succeed(entries.map((entry) => entry.idString))
      )
      assert.deepStrictEqual(uploaded, Option.some([local.idString]))

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

  it.effect("withRemoteUncommited does not advance the checkpoint when its callback fails", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeIndexedDb({ database: uniqueName("journal") })
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const written = yield* journal.writeMany({
        entries: [
          { event: "Repro", primaryKey: "a", payload: new Uint8Array() },
          { event: "Repro", primaryKey: "b", payload: new Uint8Array() }
        ],
        effect: Effect.succeed
      })
      const ids = written.map((entry) => entry.idString)
      const failed = yield* Effect.exit(journal.withRemoteUncommited(remoteId, (entries) =>
        Effect.gen(function*() {
          assert.deepStrictEqual(entries.map((entry) => entry.idString), ids)
          return yield* Effect.fail("upload failed")
        })))
      assert.deepStrictEqual(failed, Exit.fail("upload failed"))

      const retried = yield* journal.withRemoteUncommited(
        remoteId,
        (entries) => Effect.succeed(entries.map((entry) => entry.idString))
      )
      assert.deepStrictEqual(retried, Option.some(ids))
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
})
