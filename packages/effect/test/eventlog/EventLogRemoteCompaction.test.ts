import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Schema, Stream } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as RemoteCompaction from "effect/eventlog/internal/remoteCompaction"

const Item = Schema.Struct({ id: Schema.String, value: Schema.Number })
const Items = EventGroup.empty.add({ tag: "ItemSet", primaryKey: (payload) => payload.id, payload: Item })
const Notes = EventGroup.empty.add({ tag: "NoteSet", primaryKey: (payload) => payload.id, payload: Item })
// A newer client's schema, with a field this client does not know.
const SkewedItems = EventGroup.empty.add({
  tag: "ItemSet",
  primaryKey: (payload) => payload.id,
  payload: Schema.Struct({ ...Item.fields, note: Schema.String })
})

const makeEntry = Effect.fnUntraced(function*(
  msecs: number,
  event: string,
  codec: Schema.Codec<any, Uint8Array<ArrayBuffer>>,
  payload: { readonly id: string; readonly value: number; readonly note?: string }
) {
  return new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event,
    primaryKey: payload.id,
    payload: yield* Schema.encodeUnknownEffect(codec)(payload)
  }, { disableChecks: true })
})

// Runs the engine over `entries`, in input-sequence order, with the
// compactors `layer` registers.
const run = (
  layer: Layer.Layer<never, never, EventLog.Registry>,
  entries: ReadonlyArray<EventJournal.Entry>
) =>
  Effect.gen(function*() {
    const registry = yield* EventLog.Registry
    return yield* RemoteCompaction.run({
      compactors: registry.compactors,
      entries: Stream.fromIterable(entries),
      chunkSize: 100
    })
  }).pipe(Effect.provide(layer.pipe(Layer.provideMerge(EventLog.layerRegistry))))

// Keeps the newest decoded entry of each primary key.
const keepLatest = (group: EventGroup.EventGroup<any>) =>
  EventLog.groupBatchCompaction(group, ({ entries, forward }) => {
    const latest = new Map<string, EventJournal.Entry>()
    for (const { entry, event } of entries) {
      if (event === undefined) continue
      const current = latest.get(entry.primaryKey)
      if (current === undefined || EventJournal.Entry.Order(current, entry) < 0) latest.set(entry.primaryKey, entry)
    }
    return Effect.forEach(latest.values(), forward, { discard: true })
  }, { remote: true })

describe("RemoteCompaction", () => {
  it.effect("keeps the whole input of a call that outputs a new entry and carries on", () =>
    Effect.gen(function*() {
      const items = [
        yield* makeEntry(1000, "ItemSet", Items.events.ItemSet.payloadSchemaBinary, { id: "a", value: 1 }),
        yield* makeEntry(2000, "ItemSet", Items.events.ItemSet.payloadSchemaBinary, { id: "a", value: 2 })
      ]
      const notes = [
        yield* makeEntry(1000, "NoteSet", Notes.events.NoteSet.payloadSchemaBinary, { id: "a", value: 1 }),
        yield* makeEntry(2000, "NoteSet", Notes.events.NoteSet.payloadSchemaBinary, { id: "a", value: 2 })
      ]
      const kept = yield* run(
        Layer.mergeAll(
          EventLog.groupCompaction(Items, ({ events, write }) => write("ItemSet", events[events.length - 1].payload), {
            remote: true
          }),
          keepLatest(Notes)
        ),
        [items[0], notes[0], items[1], notes[1]]
      )
      assert.deepStrictEqual(kept, [items[0], items[1], notes[1]])
    }))

  it.effect("keeps entries with fields the schema does not know, even when the compactor drops them", () =>
    Effect.gen(function*() {
      const older = yield* makeEntry(1000, "ItemSet", Items.events.ItemSet.payloadSchemaBinary, { id: "a", value: 1 })
      const skewed = yield* makeEntry(2000, "ItemSet", SkewedItems.events.ItemSet.payloadSchemaBinary, {
        id: "a",
        value: 2,
        note: "n"
      })
      const newer = yield* makeEntry(3000, "ItemSet", Items.events.ItemSet.payloadSchemaBinary, { id: "a", value: 3 })
      const kept = yield* run(keepLatest(Items), [older, skewed, newer])
      assert.deepStrictEqual(kept, [skewed, newer])
    }))

  it.effect("fails the run when the kept set does not survive another pass", () =>
    Effect.gen(function*() {
      const entries = yield* Effect.forEach([1, 2, 3], (value) =>
        makeEntry(1000 * value, "ItemSet", Items.events.ItemSet.payloadSchemaBinary, { id: "a", value }))
      // Drops the oldest entry of every call, so a second pass drops again.
      const dropFirst = EventLog.groupBatchCompaction(
        Items,
        ({ entries, forward }) =>
          Effect.forEach(entries.slice(1), ({ entry }) => forward(entry), { discard: true }),
        { remote: true }
      )
      const error = yield* Effect.flip(run(dropFirst, entries))
      assert.strictEqual(error._tag, "IdempotenceError")
    }))

  it.effect("fails the run when a compactor dies", () =>
    Effect.gen(function*() {
      const entry = yield* makeEntry(1000, "ItemSet", Items.events.ItemSet.payloadSchemaBinary, { id: "a", value: 1 })
      const exit = yield* Effect.exit(
        run(EventLog.groupBatchCompaction(Items, () => Effect.die("boom"), { remote: true }), [entry])
      )
      assert.isTrue(Exit.hasDies(exit))
    }))
})
