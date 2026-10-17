import { assert, describe, it, vi } from "@effect/vitest"
import { Effect, Option } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"

const entry = (msecs: number, event = "Repro", primaryKey = "key") =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event,
    primaryKey,
    payload: new Uint8Array()
  }, { disableChecks: true })

const idStrings = (entries: ReadonlyArray<EventJournal.Entry>) => entries.map((item) => item.idString)

describe("EventJournal", () => {
  it("decodes the 48-bit UUID v7 timestamp from entry ids", () => {
    const cases: ReadonlyArray<readonly [prefix: ReadonlyArray<number>, millis: number]> = [
      [[0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 0],
      [[0x00, 0x00, 0x00, 0x00, 0x00, 0x01], 1],
      [[0x00, 0x00, 0x80, 0x00, 0x00, 0x00], 2_147_483_648],
      [[0x01, 0x02, 0x03, 0x04, 0x05, 0x06], 1_108_152_157_446],
      [[0x01, 0x99, 0xc8, 0x2c, 0xc0, 0x00], 1_760_000_000_000],
      [[0xff, 0xff, 0xff, 0xff, 0xff, 0xff], 281_474_976_710_655]
    ]
    for (const [prefix, millis] of cases) {
      const id = new Uint8Array(16).fill(0xab) as EventJournal.EntryId
      id.set(prefix)
      assert.strictEqual(EventJournal.entryIdMillis(id), millis)
      assert.strictEqual(entry(millis).createdAtMillis, millis)
    }
  })

  it("generates strictly ascending entry ids when the clock stalls or moves backwards", () => {
    // Later than any clock-based id generated so far in this process.
    const start = Date.now() + 1_000_000
    const now = vi.spyOn(Date, "now").mockReturnValue(start)
    try {
      const ids = Array.from({ length: 10_000 }, () => EventJournal.makeEntryIdUnsafe())
      now.mockReturnValue(start - 60_000)
      ids.push(EventJournal.makeEntryIdUnsafe())
      for (let i = 1; i < ids.length; i++) {
        if (EventJournal.EntryIdOrder(ids[i - 1], ids[i]) !== -1) {
          assert.fail(`id ${i} does not sort after id ${i - 1}`)
        }
      }
      // Exhausting a millisecond may move timestamps ahead slightly, never back.
      const millis = ids.map(EventJournal.entryIdMillis)
      assert.isAtLeast(Math.min(...millis), start)
      assert.isAtMost(Math.max(...millis), start + 3)
    } finally {
      now.mockRestore()
    }
  })

  it.effect("orders imported entries by timestamp and reports newer conflicts per event and key", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeMemory
      const peer = EventJournal.makeRemoteIdUnsafe()
      yield* journal.nextRemoteSequence(peer)

      const a1 = entry(1_000, "A", "k1")
      const a2 = entry(3_000, "A", "k1")
      const otherKey = entry(3_000, "A", "k2")
      const otherEvent = entry(3_000, "B", "k1")
      const sameMillis = entry(2_000, "A", "k1")
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [a1, a2, otherKey, otherEvent, sameMillis].map((entry, remoteSequence) =>
          new EventJournal.RemoteEntry({ remoteSequence, entry })
        ),
        effect: () => Effect.void
      })

      const x = entry(2_000, "A", "k1")
      const y = entry(1_500, "A", "k1")
      const z = entry(3_000, "B", "k1")
      const replayed: Array<readonly [string, ReadonlyArray<string>]> = []
      let callbacks = 0
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [x, y, z].map((entry, remoteSequence) => new EventJournal.RemoteEntry({ remoteSequence, entry })),
        effect: (batch) =>
          Effect.sync(() => {
            callbacks++
            for (const { conflicts, entry } of batch) replayed.push([entry.idString, idStrings(conflicts)])
          })
      })

      assert.strictEqual(callbacks, 1)
      assert.deepStrictEqual(replayed, [
        [x.idString, [a2.idString]],
        [y.idString, [sameMillis.idString, a2.idString]],
        [z.idString, []]
      ])

      // Equal timestamps keep committed entries ahead of imported ones, then
      // preserve batch order.
      const expected = idStrings([a1, y, sameMillis, x, a2, otherKey, otherEvent, z])
      assert.deepStrictEqual(idStrings(yield* journal.entries), expected)
      const missing = yield* journal.withRemoteUncommited(peer, (entries) => Effect.succeed(idStrings(entries)))
      assert.deepStrictEqual(missing, Option.some(expected))
    }))

  it.effect("orders the journal and remote backlogs after a local write following a future import", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeMemory
      const peer = EventJournal.makeRemoteIdUnsafe()
      const source = EventJournal.makeRemoteIdUnsafe()
      yield* journal.nextRemoteSequence(peer)
      yield* journal.nextRemoteSequence(source)

      const future = entry(281_474_976_710_655)
      yield* journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: future })],
        effect: () => Effect.void
      })
      const local = yield* journal.write({
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array(),
        effect: Effect.succeed
      })
      const imported = entry(281_474_976_710_654)
      let conflicts: Array<string> = []
      yield* journal.writeFromRemote({
        remoteId: source,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry: imported })],
        effect: (batch) =>
          Effect.sync(() => {
            conflicts = batch.flatMap((item) => idStrings(item.conflicts))
          })
      })

      // The unordered journal still reports the newer future entry.
      assert.deepStrictEqual(conflicts, idStrings([future]))
      const expected = idStrings([local, imported, future])
      assert.deepStrictEqual(idStrings(yield* journal.entries), expected)
      const missing = yield* journal.withRemoteUncommited(peer, (entries) => Effect.succeed(idStrings(entries)))
      assert.deepStrictEqual(missing, Option.some(expected))
      const sourceMissing = yield* journal.withRemoteUncommited(source, (entries) => Effect.succeed(idStrings(entries)))
      assert.deepStrictEqual(sourceMissing, Option.some(idStrings([local, future])))
    }))

  it.effect("relays an imported entry to another remote", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeMemory
      const source = EventJournal.makeRemoteIdUnsafe()
      const target = EventJournal.makeRemoteIdUnsafe()
      yield* journal.nextRemoteSequence(target)
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array()
      }, { disableChecks: true })
      yield* journal.writeFromRemote({
        remoteId: source,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry })],
        effect: () => Effect.void
      })
      let targetCalls = 0
      const missing = yield* journal.withRemoteUncommited(target, (entries) =>
        Effect.sync(() => {
          targetCalls++
          return entries
        }))
      if (Option.isNone(missing)) assert.fail("Expected the callback result")
      assert.deepStrictEqual(missing.value.map((item) => item.idString), [entry.idString])
      assert.strictEqual(targetCalls, 1)

      let sourceCalls = 0
      const sourceMissing = yield* journal.withRemoteUncommited(source, () =>
        Effect.sync(() => {
          sourceCalls++
          return "called"
        }))
      assert.isTrue(Option.isNone(sourceMissing))
      assert.strictEqual(sourceCalls, 0)
    }))

  it.effect("returns the next unused remote sequence", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeMemory
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array()
      }, { disableChecks: true })

      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 0)
      yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 0, entry })],
        effect: () => Effect.void
      })
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 1)
      yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 5, entry })],
        effect: () => Effect.void
      })
      assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 6)
    }))

  it.effect("records entries in memory and publishes local changes", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.EventJournal
      let created = 0
      yield* journal.write({
        event: "test",
        primaryKey: "pk-1",
        payload: new Uint8Array([1, 2, 3]),
        effect: (entry) =>
          Effect.sync(() => {
            created = entry.createdAtMillis
          })
      })
      const entries = yield* journal.entries
      assert.strictEqual(entries.length, 1)
      assert.strictEqual(entries[0].event, "test")
      assert.strictEqual(entries[0].primaryKey, "pk-1")
      assert.strictEqual(entries[0].createdAtMillis, created)
    }).pipe(Effect.provide(EventJournal.layerMemory)))
})
