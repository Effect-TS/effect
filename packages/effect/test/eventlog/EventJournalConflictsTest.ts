import { assert, it } from "@effect/vitest"
import { Array as Arr, Effect } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import type * as Scope from "effect/Scope"
import { limitParameters, maxParameters } from "./SqlParameterLimit.ts"

// `tail` fixes the random id bytes, so entries sharing a millisecond sort in a
// known order by id.
const entry = (msecs: number, tail: number, payload: number) => {
  const id = EventJournal.makeEntryIdUnsafe({ msecs })
  id.fill(tail, 6)
  return new EventJournal.Entry({
    id,
    event: "Repro",
    primaryKey: "key",
    payload: new Uint8Array([payload])
  }, { disableChecks: true })
}

const remoteEntries = (entries: ReadonlyArray<EventJournal.Entry>) =>
  entries.map((entry, remoteSequence) => new EventJournal.RemoteEntry({ remoteSequence, entry }))

// A last-writer-wins handler: an entry is applied only when no stored entry
// for its key is newer.
const lastWriterWins = (journal: EventJournal.EventJournal["Service"]) => {
  const state = new Map<string, Array<number>>()
  const deliver = (entries: ReadonlyArray<EventJournal.Entry>) =>
    journal.writeFromRemote({
      remoteId: EventJournal.makeRemoteIdUnsafe(),
      entries: remoteEntries(entries),
      effect: (batch) =>
        Effect.sync(() => {
          for (const { conflicts, entry } of batch) {
            if (conflicts.length === 0) state.set(entry.primaryKey, Array.from(entry.payload))
          }
        })
    })
  return { state, deliver }
}

// Distinct events and keys past the parameter limit, so SQL journals split
// conflict lookups along both.
const crossChunkCount = 2 * maxParameters

const keyedEntry = (msecs: number, event: number, primaryKey: number) =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event: `event-${event}`,
    primaryKey: `key-${primaryKey}`,
    payload: new Uint8Array()
  }, { disableChecks: true })

/**
 * Replays a batch whose conflict lookups span several chunks of events and of
 * keys, and checks each entry gets exactly its own conflict in one callback.
 */
export const conflictsAcrossChunks = <E, R>(
  makeJournal: Effect.Effect<EventJournal.EventJournal["Service"], E, R>
) =>
  Effect.gen(function*() {
    const journal = yield* makeJournal
    const indexes = Arr.makeBy(crossChunkCount, (i) => i)
    const incoming = indexes.map((i) => keyedEntry(1_000_000 + i, i, i))
    const newer = indexes.map((i) => keyedEntry(2_000_000 + i, i, i))
    // Shares an event and a key with the batch, but not as a pair, so it is
    // not a conflict.
    const crossed = indexes.map((i) => keyedEntry(3_000_000 + i, i, (i + 1) % crossChunkCount))
    yield* journal.writeFromRemote({
      remoteId: EventJournal.makeRemoteIdUnsafe(),
      entries: remoteEntries([...newer, ...crossed]),
      effect: () => Effect.void
    })

    const batches: Array<ReadonlyArray<readonly [string, ReadonlyArray<string>]>> = []
    yield* journal.writeFromRemote({
      remoteId: EventJournal.makeRemoteIdUnsafe(),
      entries: remoteEntries(incoming),
      effect: (batch) =>
        Effect.sync(() => {
          batches.push(batch.map(({ conflicts, entry }) => [entry.idString, conflicts.map((entry) => entry.idString)]))
        })
    })

    assert.deepStrictEqual(batches, [incoming.map((entry, i) => [entry.idString, [newer[i].idString]])])
  }).pipe(limitParameters)

export const suite = (
  makeJournal: Effect.Effect<EventJournal.EventJournal["Service"], unknown, Scope.Scope>
) => {
  it.effect("converges when same-key entries arrive in one batch out of id order", () =>
    Effect.gen(function*() {
      const newer = entry(2_000, 0x10, 2)
      const older = entry(1_000, 0x10, 1)

      const batched = lastWriterWins(yield* makeJournal)
      yield* batched.deliver([newer, older])

      const separate = lastWriterWins(yield* makeJournal)
      yield* separate.deliver([newer])
      yield* separate.deliver([older])

      assert.deepStrictEqual({
        batched: batched.state.get("key"),
        separate: separate.state.get("key")
      }, {
        batched: [2],
        separate: [2]
      })
    }))

  it.effect("reports a newer id in the same millisecond as a conflict, and not an older one", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const lower = entry(1_000, 0x01, 1)
      const higher = entry(1_000, 0x30, 3)
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([lower, higher]),
        effect: () => Effect.void
      })

      const incoming = entry(1_000, 0x10, 2)
      const conflicts: Array<string> = []
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries([incoming]),
        effect: (batch) =>
          Effect.sync(() => {
            for (const item of batch) conflicts.push(...item.conflicts.map((entry) => entry.idString))
          })
      })

      assert.deepStrictEqual(conflicts, [higher.idString])
    }))
}
