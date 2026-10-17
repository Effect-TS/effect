import { assert, describe, it, vi } from "@effect/vitest"
import { Effect, Equal, Hash, Option, Schema } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"

const entry = (msecs: number, event = "Repro", primaryKey = "key") =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event,
    primaryKey,
    payload: new Uint8Array()
  }, { disableChecks: true })

const idStrings = (entries: ReadonlyArray<EventJournal.Entry>) => entries.map((item) => item.idString)

// Preserve the original UUID formatter as the compatibility oracle.
const legacyStringify = (bytes: Uint8Array): string =>
  [
    bytes.subarray(0, 4),
    bytes.subarray(4, 6),
    bytes.subarray(6, 8),
    bytes.subarray(8, 10),
    bytes.subarray(10, 16)
  ].map((segment) => Array.from(segment, (byte) => byte.toString(16).padStart(2, "0")).join("")).join("-")

describe("EventJournal", () => {
  it.effect("entriesById preserves order, repeated ids and missing entries", () =>
    Effect.gen(function*() {
      const journal = yield* EventJournal.makeMemory
      const entries: Array<EventJournal.Entry> = []
      for (const primaryKey of ["first", "second"]) {
        entries.push(
          yield* journal.write({
            event: "Repro",
            primaryKey,
            payload: new Uint8Array([entries.length + 1]),
            effect: Effect.succeed
          })
        )
      }
      const [first, second] = entries
      const missing = EventJournal.makeEntryIdUnsafe()
      const found = yield* journal.entriesById([
        second.id.slice() as EventJournal.EntryId,
        missing,
        first.id.slice() as EventJournal.EntryId,
        second.id.slice() as EventJournal.EntryId
      ])
      assert.deepStrictEqual(found, [second, undefined, first, second])
      assert.deepStrictEqual(yield* journal.entriesById([]), [])
    }))

  it("formats schema-accepted ids identically to the original UUID formatter", () => {
    const ids: Array<Uint8Array> = [new Uint8Array(16), new Uint8Array(16).fill(0xff)]
    for (let length = 0; length < 16; length++) {
      ids.push(Uint8Array.from({ length }, (_, offset) => offset + 1))
    }
    // Exercise every lookup-table value, including bytes that need a leading zero.
    for (let start = 0; start < 256; start += 16) {
      ids.push(Uint8Array.from({ length: 16 }, (_, offset) => start + offset))
    }
    for (let i = 0; i < 100; i++) {
      ids.push(
        crypto.getRandomValues(new Uint8Array(16)),
        EventJournal.makeRemoteIdUnsafe(),
        EventJournal.makeEntryIdUnsafe({ msecs: i })
      )
    }
    for (const id of ids) {
      const item = new EventJournal.Entry({
        id: Schema.decodeUnknownSync(EventJournal.EntryId)(id),
        event: "Repro",
        primaryKey: "key",
        payload: new Uint8Array()
      })
      assert.strictEqual(item.idString, legacyStringify(id))
    }
  })

  it("memoizes idString per entry instance, not per id buffer", () => {
    const id = new Uint8Array(16) as EventJournal.EntryId
    const makeEntry = () =>
      new EventJournal.Entry({ id, event: "Repro", primaryKey: "key", payload: new Uint8Array() }, {
        disableChecks: true
      })
    const first = makeEntry()
    assert.strictEqual(first.idString, "00000000-0000-0000-0000-000000000000")

    // Changing the public byte buffer must not cause an already-read entry to reformat.
    id.fill(0xff)
    const second = makeEntry()
    assert.strictEqual(second.idString, "ffffffff-ffff-ffff-ffff-ffffffffffff")
    id.fill(0x11)
    assert.strictEqual(first.idString, "00000000-0000-0000-0000-000000000000")
    assert.strictEqual(second.idString, "ffffffff-ffff-ffff-ffff-ffffffffffff")
  })

  it("keeps equality, hashing and JSON independent of idString access", () => {
    const first = entry(1_000)
    const second = new EventJournal.Entry({
      id: first.id,
      event: first.event,
      primaryKey: first.primaryKey,
      payload: first.payload
    })
    const json = JSON.stringify(first)

    assert.strictEqual(first.idString, legacyStringify(first.id))
    assert.deepStrictEqual({
      equal: Equal.equals(first, second),
      sameHash: Hash.hash(first) === Hash.hash(second),
      json: JSON.stringify(first)
    }, { equal: true, sameHash: true, json })
  })

  it("reads idString on a frozen entry", () => {
    const item = Object.freeze(entry(1_000))
    assert.strictEqual(item.idString, legacyStringify(item.id))
  })

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
