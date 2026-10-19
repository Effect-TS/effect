import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Queue, Schema, SchemaGetter } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as EventRow from "effect/eventlog/EventRow"

const Grocery = EventRow.make("grocery", {
  key: "id",
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    quantity: Schema.NullOr(Schema.Number),
    completed: Schema.Boolean
  })
})

const Groceries = EventGroup.empty.add(Grocery)
const schema = EventLog.schema(Groceries)

type Row = {
  readonly id: string
  readonly name: string
  readonly quantity: number | null
  readonly completed: boolean
}
type Fields = Partial<Omit<Row, "id">>
type Payload = ReturnType<typeof Grocery.set> | ReturnType<typeof Grocery.patch> | ReturnType<typeof Grocery.remove>
type Call = readonly ["set", Row] | readonly ["patch", string, Fields] | readonly ["remove", string]

const makeEntry = (msecs: number) =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event: "grocery",
    primaryKey: "g1",
    payload: new Uint8Array()
  }, { disableChecks: true })

// An entry carrying `payload` encoded as the journal stores it.
const makeEntryWith = <A>(
  msecs: number,
  row: { readonly tag: string; readonly primaryKey: (payload: A) => string },
  codec: Schema.Codec<A, Uint8Array<ArrayBuffer>>,
  payload: A
) =>
  Effect.map(Schema.encodeEffect(codec)(payload), (bytes) =>
    new EventJournal.Entry({
      id: EventJournal.makeEntryIdUnsafe({ msecs }),
      event: row.tag,
      primaryKey: row.primaryKey(payload),
      payload: bytes
    }, { disableChecks: true }))

// Runs the generated handler for a late `payload` whose stored newer
// conflicts are `conflicts` (oldest first), returning the callbacks it made.
const replay = Effect.fnUntraced(function*(payload: Payload, conflicts: ReadonlyArray<Payload>) {
  const calls: Array<Call> = []
  const handler = EventRow.handler(Grocery, {
    set: (row) => Effect.sync(() => calls.push(["set", row])),
    patch: (id, fields) => Effect.sync(() => calls.push(["patch", id, fields])),
    remove: (id) => Effect.sync(() => calls.push(["remove", id]))
  })
  yield* handler({
    storeId: yield* EventLog.CurrentStoreId,
    payload,
    entry: yield* makeEntryWith(1000, Grocery, Groceries.events.grocery.payloadSchemaBinary, payload),
    conflicts: conflicts.map((payload, i) => ({ entry: makeEntry(2000 + i), payload }))
  })
  return calls
})

const X: Row = { id: "g1", name: "x", quantity: 1, completed: false }
const Y: Row = { id: "g1", name: "y", quantity: 2, completed: true }
const E: Row = { id: "g1", name: "e", quantity: null, completed: false }
const P: Fields = { name: "p", quantity: 3 }
const Q: Fields = { name: "q", completed: true }

const Shelf = EventRow.make("shelf", {
  key: "id",
  schema: Schema.Struct({
    id: Schema.String,
    box: Schema.Struct({ n: Schema.Number }),
    items: Schema.Array(Schema.Struct({ n: Schema.Number })),
    label: Schema.OptionFromOptionalKey(Schema.String)
  })
})
const ShelfCodec = EventGroup.empty.add(Shelf).events.shelf.payloadSchemaBinary

// Decoding is not undone by encoding, so a value decoded twice differs from
// one decoded once.
const Stamp = EventRow.make("stamp", {
  key: "id",
  schema: Schema.Struct({
    id: Schema.String,
    mark: Schema.String.pipe(Schema.decode({
      decode: SchemaGetter.transform((s: string) => `${s}!`),
      encode: SchemaGetter.transform((s: string) => s)
    }))
  })
})
const StampCodec = EventGroup.empty.add(Stamp).events.stamp.payloadSchemaBinary

const Key = Schema.Literals(["a", "b"])
const Name = Schema.Literals(["x", "y"])
const Quantity = Schema.NullOr(Schema.Literals([1, 2]))
const Op = Schema.Union([
  Schema.TaggedStruct("set", { key: Key, name: Name, quantity: Quantity, completed: Schema.Boolean }),
  Schema.TaggedStruct("patch", {
    key: Key,
    name: Schema.optionalKey(Name),
    quantity: Schema.optionalKey(Quantity),
    completed: Schema.optionalKey(Schema.Boolean)
  }),
  Schema.TaggedStruct("remove", { key: Key })
])
const ReplicaIndex = Schema.Literals([0, 1, 2])
const Command = Schema.Union([
  // A local write of one or more ops on a replica, through `writeMany`.
  Schema.TaggedStruct("write", { replica: ReplicaIndex, ops: Schema.NonEmptyArray(Op).check(Schema.isMaxLength(3)) }),
  Schema.TaggedStruct("offline", { skewMillis: Schema.Literals([-1000, -1, 0, 1, 1000]), op: Op }),
  // Delivers some missing entries in a picked order, split into batches.
  Schema.TaggedStruct("sync", {
    replica: ReplicaIndex,
    picks: Schema.Array(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 99 }))).check(
      Schema.isMaxLength(8)
    ),
    batchSizes: Schema.NonEmptyArray(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 4 }))).check(
      Schema.isMaxLength(4)
    )
  })
])

const toPayload = (op: typeof Op.Type): Payload => {
  switch (op._tag) {
    case "set": {
      const { _tag, key, ...fields } = op
      return Grocery.set({ id: key, ...fields })
    }
    case "patch": {
      const { _tag, key, ...fields } = op
      return Grocery.patch(key, fields)
    }
    case "remove": {
      return Grocery.remove(op.key)
    }
  }
}

type Replica = Effect.Success<ReturnType<typeof makeReplica>>

// An `EventLog` on a memory journal whose storage is a map of rows, fed by a
// remote whose changes the test delivers by hand.
const makeReplica = Effect.fnUntraced(function*(compact = false) {
  const storage = new Map<string, Row>()
  const applied = yield* Queue.unbounded<void>()
  const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
  const journal = yield* EventJournal.makeMemory
  const handlers = EventLog.group(Groceries, (handlers) =>
    handlers.handle(
      "grocery",
      EventRow.handler(Grocery, {
        set: (row) => Effect.sync(() => storage.set(row.id, row)),
        patch: (id, fields) =>
          Effect.sync(() => {
            const row = storage.get(id)
            if (row !== undefined) storage.set(id, { ...row, ...fields })
          }),
        remove: (id) => Effect.sync(() => storage.delete(id))
      })
    )).pipe(Layer.provide(EventLog.layerRegistry))
  const context = yield* Layer.build(
    EventLog.layer(schema, handlers).pipe(
      Layer.provide([
        Layer.succeed(
          EventJournal.EventJournal,
          EventJournal.EventJournal.of({
            ...journal,
            writeFromRemote: (options) =>
              journal.writeFromRemote(options).pipe(Effect.tap(() => Queue.offer(applied, undefined)))
          })
        ),
        Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(Layer.provide(EventLogEncryption.layerSubtle))
      ])
    )
  )
  const registry = Context.get(context, EventLog.Registry)
  if (compact) {
    const compaction: Layer.Layer<never, never, EventLog.Registry> = EventRow.compaction(Groceries, Grocery)
    yield* Layer.build(
      compaction.pipe(
        Layer.provide(Layer.succeed(EventLog.Registry, registry))
      )
    )
  }
  yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
    id: EventJournal.makeRemoteIdUnsafe(),
    changes: () => Effect.succeed(changes),
    write: () => Effect.void,
    whenAuthenticated: (effect) => effect
  }))

  let remoteSequence = 0
  const deliverBatch = Effect.fnUntraced(function*(entries: ReadonlyArray<EventJournal.Entry>) {
    yield* Queue.offerAll(
      changes,
      entries.map((entry) => new EventJournal.RemoteEntry({ remoteSequence: remoteSequence++, entry }))
    )
    // The log may take a batch in more than one read.
    while (true) {
      yield* Queue.take(applied)
      const stored = yield* journal.entriesById(entries.map((entry) => entry.id))
      if (stored.every((entry) => entry !== undefined)) return
    }
  })

  return {
    storage,
    journal,
    log: Context.get(context, EventLog.EventLog),
    deliver: Effect.fnUntraced(
      function*(entries: ReadonlyArray<EventJournal.Entry>, batchSizes: ReadonlyArray<number>) {
        for (let i = 0, batch = 0; i < entries.length; batch++) {
          const size = batchSizes[batch % batchSizes.length]
          yield* deliverBatch(entries.slice(i, i + size))
          i += size
        }
      }
    )
  }
})

describe("EventRow", () => {
  it.effect("keeps written keys stable across decoding and delivery order", () =>
    Effect.gen(function*() {
      const keySchema = Schema.String.pipe(Schema.decode({
        decode: SchemaGetter.transform((s: string) => `${s}!`),
        encode: SchemaGetter.transform((s: string) => s)
      }))
      const rowSchema = Schema.Struct({ id: keySchema, n: Schema.Number })
      const actual: Array<unknown> = []
      const expected: Array<unknown> = []
      for (const declaration of ["id", { fields: ["id"] }] as const) {
        const row = EventRow.make("stable", { key: declaration, schema: rowSchema })
        const codec = EventGroup.empty.add(row).events.stable.payloadSchemaBinary
        const written = { id: "a", n: 1 }
        const key = row.keyOf(written)
        const payloads = [row.set(written), row.patch(key, { n: 2 })]
        const entries = yield* Effect.forEach(payloads, (payload, i) => makeEntryWith(1000 + i, row, codec, payload))
        const decoded = yield* Effect.forEach(entries, (entry) => Schema.decodeUnknownEffect(codec)(entry.payload))
        for (const order of [[0, 1], [1, 0]]) {
          const storage = new Map<string, typeof rowSchema.Type>()
          const handler = EventRow.handler(row, {
            set: (value, key) => Effect.sync(() => storage.set(key, value)),
            patch: (key, fields) =>
              Effect.sync(() => {
                const value = storage.get(key)
                if (value !== undefined) storage.set(key, { ...value, ...fields })
              }),
            remove: (key) => Effect.sync(() => storage.delete(key))
          })
          const delivered = new Set<number>()
          for (const i of order) {
            yield* handler({
              storeId: yield* EventLog.CurrentStoreId,
              payload: decoded[i],
              entry: entries[i],
              conflicts: [...delivered].filter((j) => j > i).map((j) => ({ entry: entries[j], payload: decoded[j] }))
            })
            delivered.add(i)
          }
          actual.push([...storage])
          expected.push([[key, { id: "a!", n: 2 }]])
        }
      }
      assert.deepStrictEqual(actual, expected)
    }))

  it.effect("routes declared composite and derived keys through the same row", () =>
    Effect.gen(function*() {
      const rowSchema = Schema.Struct({ list: Schema.String, aisle: Schema.String, value: Schema.Number })
      const cases = [
        {
          tag: "composite",
          declaration: { fields: ["list", "aisle"] },
          key: "[\"a|b\",\"c\"]",
          otherKey: "[\"a\",\"b|c\"]"
        },
        {
          tag: "derived",
          declaration: { fields: ["list"], derive: ({ list }: { readonly list: string }) => list.toLowerCase() },
          key: "a|b",
          otherKey: "a"
        },
        {
          tag: "derivedComposite",
          declaration: {
            fields: ["list", "aisle"],
            derive: ({ list, aisle }: { readonly list: string; readonly aisle: string }) =>
              JSON.stringify([list.toLowerCase(), aisle.toLowerCase()])
          },
          key: "[\"a|b\",\"c\"]",
          otherKey: "[\"a\",\"b|c\"]"
        },
        { tag: "single", declaration: "list", key: "A|B", otherKey: "a" }
      ] as const
      for (const { tag, declaration, key, otherKey } of cases) {
        const row = EventRow.make(tag, { key: declaration, schema: rowSchema })
        const initial = { list: "A|B", aisle: "c", value: 1 }
        // The default tuple encoding preserves case.
        const input = row.tag === "composite" ? { ...initial, list: "a|b" } : initial
        const other = { list: "a", aisle: "b|c", value: 3 }
        assert.strictEqual(row.keyOf(input), key)
        assert.deepStrictEqual(row.keyFields, typeof declaration === "string" ? [declaration] : declaration.fields)
        assert.strictEqual(row.primaryKey(row.set(other)), otherKey)
        assert.notStrictEqual(key, otherKey)
        const storage = new Map<string, typeof rowSchema.Type>()
        const calls: Array<readonly [string, string]> = []
        const handler = EventRow.handler(row, {
          set: (value: typeof rowSchema.Type, key: string) =>
            Effect.sync(() => {
              calls.push(["set", key])
              storage.set(key, value)
            }),
          patch: (key, fields) =>
            Effect.sync(() => {
              calls.push(["patch", key])
              const value = storage.get(key)
              if (value !== undefined) storage.set(key, { ...value, ...fields })
            }),
          remove: (key) =>
            Effect.sync(() => {
              calls.push(["remove", key])
              storage.delete(key)
            })
        })
        const codec = EventGroup.empty.add(row).events[row.tag].payloadSchemaBinary
        const payloads = [row.set(input), row.patch(key, { value: 2 }), row.remove(key)]
        for (const [i, payload] of payloads.entries()) {
          assert.strictEqual(row.primaryKey(payload), key)
          yield* handler({
            storeId: yield* EventLog.CurrentStoreId,
            payload,
            entry: new EventJournal.Entry({
              id: EventJournal.makeEntryIdUnsafe({ msecs: 1000 + i }),
              event: row.tag,
              primaryKey: key,
              payload: yield* Schema.encodeEffect(codec)(payload)
            }, { disableChecks: true }),
            conflicts: []
          })
          assert.deepStrictEqual([...storage], i === 2 ? [] : [[key, { ...input, value: i + 1 }]])
        }
        assert.deepStrictEqual(calls, [["set", key], ["patch", key], ["remove", key]])
      }
    }))

  it.effect("compacts only shadowed entries within the same row tag and key", () =>
    Effect.gen(function*() {
      const Other = EventRow.make("other", { key: "id", schema: Grocery.schema })
      const notice = { tag: "notice", payload: Schema.String, primaryKey: (id: string) => id } as const
      const NoticeGroup = EventGroup.empty.add(notice)
      const group = Groceries.add(Other).add(notice)
      const registry = yield* EventLog.Registry
      const register = (layer: Layer.Layer<never, never, EventLog.Registry>) =>
        Layer.build(layer.pipe(Layer.provide(Layer.succeed(EventLog.Registry, registry))))
      yield* register(EventLog.groupBatchCompaction(NoticeGroup, ({ entries, forward }) =>
        Effect.forEach(entries, ({ entry }) =>
          forward(entry), { discard: true })))
      const noticeCompactor = registry.compactors.get("notice")!
      yield* register(EventRow.compaction(group, Grocery))
      yield* register(EventRow.compaction(group, Other))
      assert.strictEqual(registry.compactors.get("notice"), noticeCompactor)
      assert.deepStrictEqual([...registry.compactors.get("grocery")!.events], ["grocery"])
      assert.deepStrictEqual([...registry.compactors.get("other")!.events], ["other"])

      type Input = readonly ["grocery" | "other", Payload]
      const cases: ReadonlyArray<readonly [string, ReadonlyArray<Input>, ReadonlyArray<number>]> = [
        ...([Grocery.set(X), Grocery.patch("g1", P), Grocery.remove("g1")] as const).flatMap((older) =>
          [Grocery.set(Y), Grocery.remove("g1")].map((newer) =>
            [
              older._tag + " before " + newer._tag,
              [["grocery", older], ["grocery", newer]],
              [1]
            ] as const
          )
        ),
        ["patch covered by newer patch", [
          ["grocery", Grocery.patch("g1", { name: "old" })],
          ["grocery", Grocery.patch("g1", P)]
        ], [1]],
        ["equal patch field sets", [["grocery", Grocery.patch("g1", P)], ["grocery", Grocery.patch("g1", P)]], [1]],
        ["patch jointly covered by newer patches", [
          ["grocery", Grocery.patch("g1", P)],
          ["grocery", Grocery.patch("g1", { name: "new" })],
          ["grocery", Grocery.patch("g1", { quantity: 4 })]
        ], [1, 2]],
        ["empty patch covered by patch", [["grocery", Grocery.patch("g1", {})], ["grocery", Grocery.patch("g1", P)]], [
          1
        ]],
        ["partially overlapping patches", [["grocery", Grocery.patch("g1", P)], ["grocery", Grocery.patch("g1", Q)]], [
          0,
          1
        ]],
        ["disjoint patches", [
          ["grocery", Grocery.patch("g1", { name: "old" })],
          ["grocery", Grocery.patch("g1", { completed: true })]
        ], [0, 1]],
        ["set is required even before a patch of every field", [
          ["grocery", Grocery.set(X)],
          ["grocery", Grocery.patch("g1", { name: "new", quantity: null, completed: true })]
        ], [0, 1]],
        ["remove is required before patch", [["grocery", Grocery.remove("g1")], ["grocery", Grocery.patch("g1", P)]], [
          0,
          1
        ]],
        ["different key cannot shadow", [["grocery", Grocery.set(X)], ["grocery", Grocery.remove("g2")]], [0, 1]],
        ["different tag cannot shadow the same key", [["grocery", Grocery.set(X)], ["other", Other.remove("g1")]], [
          0,
          1
        ]]
      ]
      for (const [name, inputs, kept] of cases) {
        const entries = yield* Effect.forEach(inputs, ([event, payload], i) =>
          Effect.gen(function*() {
            return new EventJournal.Entry({
              id: EventJournal.makeEntryIdUnsafe({ msecs: 1000 + i }),
              event,
              primaryKey: payload._tag === "set" ? payload.row.id : payload.key,
              payload: yield* Schema.encodeUnknownEffect(group.events[event].payloadSchemaBinary)(payload)
            }, { disableChecks: true })
          }))
        // Batch order must not be mistaken for id order.
        const output: Array<EventJournal.Entry> = []
        for (const tag of ["grocery", "other"] as const) {
          yield* registry.compactors.get(tag)!.effect({
            entries: entries.filter((entry) =>
              entry.event === tag
            ).reverse(),
            write: (entry, source) =>
              Effect.sync(() => {
                assert.isUndefined(source, name)
                assert.isTrue(entries.includes(entry), name)
                output.push(entry)
              })
          })
        }
        assert.deepStrictEqual(output.sort(EventJournal.Entry.Order), kept.map((i) => entries[i]), name)
      }
    }).pipe(Effect.provide(EventLog.layerRegistry)))

  it.effect("composes newer conflicts with the op algebra", () =>
    Effect.gen(function*() {
      // The late entry is `set(E)`: a collapsed `set` or `remove` skips it, and
      // only a collapsed `patch` writes, as `set(E with the patch on top)`.
      const cases: ReadonlyArray<readonly [string, ReadonlyArray<Payload>, ReadonlyArray<Call>]> = [
        ["set(X) ; set(Y) = set(Y)", [Grocery.set(X), Grocery.set(Y)], []],
        ["set(X) ; patch(Q) = set(X with Q)", [Grocery.set(X), Grocery.patch("g1", Q)], []],
        ["set(X) ; remove = remove", [Grocery.set(X), Grocery.remove("g1")], []],
        ["patch(P) ; set(Y) = set(Y)", [Grocery.patch("g1", P), Grocery.set(Y)], []],
        ["patch(P) ; patch(Q) = patch(P with Q)", [Grocery.patch("g1", P), Grocery.patch("g1", Q)], [
          ["set", { id: "g1", name: "q", quantity: 3, completed: true }]
        ]],
        ["patch(P) ; remove = remove", [Grocery.patch("g1", P), Grocery.remove("g1")], []],
        ["remove ; set(Y) = set(Y)", [Grocery.remove("g1"), Grocery.set(Y)], []],
        ["remove ; patch(Q) = remove", [Grocery.remove("g1"), Grocery.patch("g1", Q)], []],
        ["remove ; remove = remove", [Grocery.remove("g1"), Grocery.remove("g1")], []]
      ]
      const actual = yield* Effect.forEach(cases, ([name, conflicts]) =>
        Effect.map(replay(Grocery.set(E), conflicts), (calls) => [name, calls] as const))
      assert.deepStrictEqual(
        actual,
        cases.map(([name, , calls]) =>
          [name, calls] as const
        )
      )
    }))

  it.effect("writes at most one callback for a late entry", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<readonly [string, Payload, ReadonlyArray<Payload>, ReadonlyArray<Call>]> = [
        ["empty, set(E)", Grocery.set(E), [], [["set", E]]],
        ["empty, patch(Q)", Grocery.patch("g1", Q), [], [["patch", "g1", Q]]],
        ["empty, remove", Grocery.remove("g1"), [], [["remove", "g1"]]],
        ["empty, empty patch", Grocery.patch("g1", {}), [], []],
        ["set(X), set(E)", Grocery.set(E), [Grocery.set(X)], []],
        ["set(X), patch(Q)", Grocery.patch("g1", Q), [Grocery.set(X)], []],
        ["set(X), remove", Grocery.remove("g1"), [Grocery.set(X)], []],
        ["remove, set(E)", Grocery.set(E), [Grocery.remove("g1")], []],
        ["remove, patch(Q)", Grocery.patch("g1", Q), [Grocery.remove("g1")], []],
        ["remove, remove", Grocery.remove("g1"), [Grocery.remove("g1")], []],
        // Required even when the row is missing and the newer patch did nothing.
        ["patch(P), set(E)", Grocery.set(E), [Grocery.patch("g1", P)], [
          ["set", { id: "g1", name: "p", quantity: 3, completed: false }]
        ]],
        ["patch(P), patch(Q)", Grocery.patch("g1", Q), [Grocery.patch("g1", P)], [["patch", "g1", {
          completed: true
        }]]],
        ["patch(P), patch covered by P", Grocery.patch("g1", { name: "r" }), [Grocery.patch("g1", P)], []],
        ["patch(P), remove", Grocery.remove("g1"), [Grocery.patch("g1", P)], [["remove", "g1"]]]
      ]
      const actual = yield* Effect.forEach(
        cases,
        ([name, payload, conflicts]) => Effect.map(replay(payload, conflicts), (calls) => [name, calls] as const)
      )
      assert.deepStrictEqual(actual, cases.map(([name, , , calls]) => [name, calls] as const))
    }))

  it.effect("replicas decode patches without filling in defaults for unwritten fields", () =>
    Effect.gen(function*() {
      const Task = EventRow.make("task", {
        key: "id",
        schema: Schema.Struct({
          id: Schema.String,
          name: Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed("default"))),
          done: Schema.Boolean
        })
      })
      const codec = EventGroup.empty.add(Task).events.task.payloadSchemaBinary
      const payloads = [Task.patch("t1", { done: true }), Task.patch("t1", {})]
      const replayed = yield* Effect.forEach(payloads, (payload) =>
        Schema.encodeUnknownEffect(codec)(payload).pipe(Effect.flatMap(Schema.decodeUnknownEffect(codec))))
      assert.deepStrictEqual(replayed, payloads)
    }))

  it.effect("passes only the row's schema fields to callbacks", () =>
    Effect.gen(function*() {
      // Replicas decode these payloads without the extra keys, so a local
      // write must not see them either. Variables bypass excess property checks.
      const fields = { id: "other", completed: true }
      const row = { ...E, note: "not in the schema" }
      const actual = [yield* replay(Grocery.patch("g1", fields), []), yield* replay(Grocery.set(row), [])]
      assert.deepStrictEqual(actual, [[["patch", "g1", { completed: true }]], [["set", E]]])
    }))

  it.effect("passes nested values to callbacks as replicas decode them", () =>
    Effect.gen(function*() {
      const calls: Array<unknown> = []
      const handler = EventRow.handler(Shelf, {
        set: (row) => Effect.sync(() => calls.push(["set", row])),
        patch: (id, fields) => Effect.sync(() => calls.push(["patch", id, fields])),
        remove: () => Effect.void
      })
      // Replicas decode nested structs without these extra keys.
      const box = { n: 1, extra: "not in the schema" }
      const items = [{ n: 2, extra: "not in the schema" }]
      const payloads = [Shelf.set({ id: "s1", box, items, label: Option.none() }), Shelf.patch("s1", { box, items })]
      for (const payload of payloads) {
        const entry = yield* makeEntryWith(1000, Shelf, ShelfCodec, payload)
        yield* handler({ storeId: yield* EventLog.CurrentStoreId, payload, entry, conflicts: [] })
      }
      assert.deepStrictEqual(calls, [
        ["set", { id: "s1", box: { n: 1 }, items: [{ n: 2 }], label: Option.none() }],
        ["patch", "s1", { box: { n: 1 }, items: [{ n: 2 }] }]
      ])
    }))

  it.effect("passes the same values to callbacks for a local write and its replay", () =>
    Effect.gen(function*() {
      const calls: Array<unknown> = []
      const handler = EventRow.handler(Stamp, {
        set: (row) => Effect.sync(() => calls.push(["set", row])),
        patch: (id, fields) => Effect.sync(() => calls.push(["patch", id, fields])),
        remove: () => Effect.void
      })
      const storeId = yield* EventLog.CurrentStoreId
      for (const payload of [Stamp.set({ id: "s1", mark: "x" }), Stamp.patch("s1", { mark: "x" })]) {
        const entry = new EventJournal.Entry({
          id: EventJournal.makeEntryIdUnsafe({ msecs: 1000 }),
          event: "stamp",
          primaryKey: "s1",
          payload: yield* Schema.encodeEffect(StampCodec)(payload)
        }, { disableChecks: true })
        // A local write passes the written payload, and a replica the decoded entry.
        yield* handler({ storeId, payload, entry, conflicts: [] })
        yield* handler({
          storeId,
          payload: yield* Schema.decodeUnknownEffect(StampCodec)(entry.payload),
          entry,
          conflicts: []
        })
      }
      assert.deepStrictEqual(calls, [
        ["set", { id: "s1", mark: "x!" }],
        ["set", { id: "s1", mark: "x!" }],
        ["patch", "s1", { mark: "x!" }],
        ["patch", "s1", { mark: "x!" }]
      ])
    }))

  it.effect("patches a field whose encoding omits None only with Some", () =>
    Effect.gen(function*() {
      const some = Shelf.patch("s1", { label: Option.some("x") })
      const replayed = yield* Schema.encodeUnknownEffect(ShelfCodec)(some).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(ShelfCodec))
      )
      // Replicas would read the omitted key as "not written", so None is refused.
      const none = yield* Effect.exit(
        Schema.encodeUnknownEffect(ShelfCodec)(Shelf.patch("s1", { label: Option.none() }))
      )
      assert.deepStrictEqual(replayed, some)
      assert.isTrue(Exit.isFailure(none))
    }))

  it.effect.prop(
    "replicas converge to the fold of every entry in id order",
    { commands: Schema.Array(Command).check(Schema.isMaxLength(24)) },
    Effect.fnUntraced(function*({ commands }) {
      const replicas = yield* Effect.forEach([0, 1, 2], () =>
        Effect.gen(function*() {
          return { plain: yield* makeReplica(), compacted: yield* makeReplica(true), single: yield* makeReplica() }
        }))
      const deliver = Effect.fnUntraced(function*(
        replica: typeof replicas[number],
        entries: ReadonlyArray<EventJournal.Entry>,
        batchSizes: ReadonlyArray<number>
      ) {
        yield* replica.plain.deliver(entries, batchSizes)
        yield* replica.compacted.deliver(entries, batchSizes)
        yield* replica.single.deliver(entries, [1])
      })
      // Every entry written anywhere, with the payload it carries.
      const server = new Map<string, { readonly entry: EventJournal.Entry; readonly payload: Payload }>()

      const missing = Effect.fnUntraced(function*(replica: Replica) {
        const known = new Set((yield* replica.journal.entries).map((entry) => entry.idString))
        return globalThis.Array.from(server.values(), ({ entry }) => entry).filter((entry) =>
          !known.has(entry.idString)
        )
      })

      for (const command of commands) {
        switch (command._tag) {
          case "write": {
            const replica = replicas[command.replica]
            const payloads = command.ops.map(toPayload)
            yield* replica.plain.log.writeMany({
              schema,
              events: [
                { event: "grocery", payload: payloads[0] },
                ...payloads.slice(1).map((payload) => ({ event: "grocery" as const, payload }))
              ]
            })
            // Local ids ascend in input order.
            const written = (yield* replica.plain.journal.entries).filter((entry) => !server.has(entry.idString))
              .sort(EventJournal.Entry.Order)
            written.forEach((entry, i) => server.set(entry.idString, { entry, payload: payloads[i] }))
            yield* replica.compacted.deliver(written, [written.length])
            yield* replica.single.deliver(written, [1])
            break
          }
          case "offline": {
            // A device whose clock is skewed against the newest entry so far.
            let latest = Date.now()
            for (const { entry } of server.values()) latest = Math.max(latest, entry.createdAtMillis)
            const payload = toPayload(command.op)
            const entry = new EventJournal.Entry({
              id: EventJournal.makeEntryIdUnsafe({ msecs: latest + command.skewMillis }),
              event: "grocery",
              primaryKey: command.op.key,
              payload: yield* Schema.encodeUnknownEffect(Groceries.events.grocery.payloadSchemaBinary)(payload)
            }, { disableChecks: true })
            server.set(entry.idString, { entry, payload })
            break
          }
          case "sync": {
            const replica = replicas[command.replica]
            const remaining = yield* missing(replica.plain)
            const picked: Array<EventJournal.Entry> = []
            for (const pick of command.picks) {
              if (remaining.length === 0) break
              picked.push(remaining.splice(pick % remaining.length, 1)[0])
            }
            yield* deliver(replica, picked, command.batchSizes)
            break
          }
        }
      }

      // Deliver the rest newest first, as one batch per replica.
      for (const replica of replicas) {
        const remaining = yield* missing(replica.plain)
        yield* deliver(replica, remaining.reverse(), [remaining.length])
      }

      const expected = new Map<string, Row>()
      for (
        const { payload } of globalThis.Array.from(server.values()).sort((a, b) =>
          EventJournal.Entry.Order(a.entry, b.entry)
        )
      ) {
        switch (payload._tag) {
          case "set": {
            expected.set(payload.row.id, payload.row)
            break
          }
          case "patch": {
            const row = expected.get(payload.key)
            if (row !== undefined) expected.set(payload.key, { ...row, ...payload.fields })
            break
          }
          case "remove": {
            expected.delete(payload.key)
            break
          }
        }
      }
      assert.deepStrictEqual(
        replicas.map(({ plain, compacted, single }) =>
          [plain, compacted, single].map((replica) => Object.fromEntries(replica.storage))
        ),
        replicas.map(() => [Object.fromEntries(expected), Object.fromEntries(expected), Object.fromEntries(expected)])
      )
    }, Effect.scoped),
    { arbitrary: { runs: 200 } }
  )
})
