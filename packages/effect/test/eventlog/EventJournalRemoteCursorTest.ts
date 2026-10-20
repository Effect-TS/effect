import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import type * as Scope from "effect/Scope"

const remoteEntries = (count: number) =>
  Array.from({ length: count }, (_, remoteSequence) =>
    new EventJournal.RemoteEntry({
      remoteSequence,
      entry: new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "Repro",
        primaryKey: `key-${remoteSequence}`,
        payload: new Uint8Array()
      }, { disableChecks: true })
    }))

export const suite = (
  makeJournal: Effect.Effect<EventJournal.EventJournal["Service"], unknown, Scope.Scope>
) => {
  it.effect("resets a remote's cursor backwards and keeps its rollback epoch", () =>
    Effect.gen(function*() {
      const journal = yield* makeJournal
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const otherRemoteId = EventJournal.makeRemoteIdUnsafe()
      yield* journal.writeFromRemote({ remoteId, entries: remoteEntries(5), effect: () => Effect.void })
      const before = {
        sequence: yield* journal.nextRemoteSequence(remoteId),
        epoch: yield* journal.remoteRollbackEpoch(remoteId)
      }

      yield* journal.resetRemoteSequence(remoteId, 2)
      yield* journal.setRemoteRollbackEpoch(remoteId, 3)

      assert.deepStrictEqual({
        before,
        sequence: yield* journal.nextRemoteSequence(remoteId),
        epoch: yield* journal.remoteRollbackEpoch(remoteId),
        otherEpoch: yield* journal.remoteRollbackEpoch(otherRemoteId)
      }, {
        before: { sequence: 5, epoch: undefined },
        sequence: 2,
        epoch: 3,
        otherEpoch: undefined
      })
    }))
}
