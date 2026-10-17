// oxlint-disable-next-line no-unassigned-import
import "fake-indexeddb/auto"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
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
