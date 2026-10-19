import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLogMessage from "effect/eventlog/EventLogMessage"
import type * as Scope from "effect/Scope"

const storeA = EventLogMessage.StoreId.make("store-a")
const storeB = EventLogMessage.StoreId.make("store-b")

const localEntry = (primaryKey: string) => ({ event: "Repro", primaryKey, payload: new Uint8Array() })

// A journal bound to `journalStoreId` fails `withLock(storeId)` with an
// `EventJournalError` whose cause names both store ids.
export const assertStoreIdMismatch = Effect.fnUntraced(function*<A, E>(
  effect: Effect.Effect<A, E>,
  expected: { readonly storeId: EventLogMessage.StoreId; readonly journalStoreId: EventLogMessage.StoreId }
) {
  const exit = yield* Effect.exit(effect)
  if (Exit.isSuccess(exit)) return assert.fail(`the journal accepted store id "${expected.storeId}"`)
  const error = Cause.findErrorOption(exit.cause)
  if (error._tag === "None") return assert.fail(`expected an EventJournalError, got ${Cause.pretty(exit.cause)}`)
  assert.instanceOf(error.value, EventJournal.EventJournalError)
  const { cause, method } = error.value as EventJournal.EventJournalError
  assert.strictEqual(method, "withLock")
  const ids = cause as { readonly storeId?: unknown; readonly journalStoreId?: unknown } | undefined
  assert.deepStrictEqual({ storeId: ids?.storeId, journalStoreId: ids?.journalStoreId }, expected)
})

export const suite = (options: {
  readonly makeJournal: Effect.Effect<EventJournal.EventJournal["Service"], unknown, Scope.Scope>
  // Returns an effect that opens another journal over the same fresh storage
  // each time it runs, for journals that persist.
  readonly makeStorage?: Effect.Effect<
    Effect.Effect<EventJournal.EventJournal["Service"], unknown, Scope.Scope>,
    unknown,
    Scope.Scope
  >
}) => {
  it.effect("fails withLock for a second store id without running the effect", () =>
    Effect.gen(function*() {
      const journal = yield* options.makeJournal
      yield* journal.withLock(storeA)(journal.writeMany({ entries: [localEntry("a")], effect: Effect.succeed }))

      let ran = false
      yield* assertStoreIdMismatch(
        journal.withLock(storeB)(Effect.andThen(
          Effect.sync(() => {
            ran = true
          }),
          journal.writeMany({ entries: [localEntry("b")], effect: Effect.succeed })
        )),
        { storeId: storeB, journalStoreId: storeA }
      )
      assert.isFalse(ran, "withLock ran the effect for the second store id")

      // The first store id keeps working.
      yield* journal.withLock(storeA)(journal.writeMany({ entries: [localEntry("c")], effect: Effect.succeed }))
      assert.deepStrictEqual((yield* journal.entries).map((entry) => entry.primaryKey), ["a", "c"])
    }))

  if (options.makeStorage === undefined) return
  const makeStorage = options.makeStorage

  it.effect("remembers the store id after the journal is reopened", () =>
    Effect.gen(function*() {
      const open = yield* makeStorage
      const first = yield* open
      yield* first.withLock(storeA)(first.writeMany({ entries: [localEntry("a")], effect: Effect.succeed }))

      const reopened = yield* open
      yield* assertStoreIdMismatch(
        reopened.withLock(storeB)(reopened.entries),
        { storeId: storeB, journalStoreId: storeA }
      )
      yield* reopened.withLock(storeA)(
        reopened.writeMany({ entries: [localEntry("b")], effect: Effect.succeed })
      )
      assert.deepStrictEqual((yield* reopened.entries).map((entry) => entry.primaryKey), ["a", "b"])
    }))

  // Another journal over the same storage, such as another tab or process,
  // must not bind it to a second store id while the first journal is open.
  it.effect("fails withLock for a second store id from another journal over the same storage", () =>
    Effect.gen(function*() {
      const open = yield* makeStorage
      const journalA = yield* open
      const journalB = yield* open
      yield* journalA.withLock(storeA)(journalA.writeMany({ entries: [localEntry("a")], effect: Effect.succeed }))

      yield* assertStoreIdMismatch(
        journalB.withLock(storeB)(journalB.entries),
        { storeId: storeB, journalStoreId: storeA }
      )
    }))
}
