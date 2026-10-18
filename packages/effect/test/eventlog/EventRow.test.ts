import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Queue, Schema } from "effect"
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
    entry: makeEntry(1000),
    conflicts: conflicts.map((payload, i) => ({ entry: makeEntry(2000 + i), payload }))
  })
  return calls
})

const X: Row = { id: "g1", name: "x", quantity: 1, completed: false }
const Y: Row = { id: "g1", name: "y", quantity: 2, completed: true }
const E: Row = { id: "g1", name: "e", quantity: null, completed: false }
const P: Fields = { name: "p", quantity: 3 }
const Q: Fields = { name: "q", completed: true }

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

type Replica = Effect.Success<typeof makeReplica>

// An `EventLog` on a memory journal whose storage is a map of rows, fed by a
// remote whose changes the test delivers by hand.
const makeReplica = Effect.gen(function*() {
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

  it.effect.prop(
    "replicas converge to the fold of every entry in id order",
    { commands: Schema.Array(Command).check(Schema.isMaxLength(24)) },
    Effect.fnUntraced(function*({ commands }) {
      const replicas = yield* Effect.forEach([0, 1, 2], () => makeReplica)
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
            yield* replica.log.writeMany({
              schema,
              events: [
                { event: "grocery", payload: payloads[0] },
                ...payloads.slice(1).map((payload) => ({ event: "grocery" as const, payload }))
              ]
            })
            // Local ids ascend in input order.
            const written = (yield* replica.journal.entries).filter((entry) => !server.has(entry.idString))
              .sort(EventJournal.Entry.Order)
            written.forEach((entry, i) => server.set(entry.idString, { entry, payload: payloads[i] }))
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
            const remaining = yield* missing(replica)
            const picked: Array<EventJournal.Entry> = []
            for (const pick of command.picks) {
              if (remaining.length === 0) break
              picked.push(remaining.splice(pick % remaining.length, 1)[0])
            }
            yield* replica.deliver(picked, command.batchSizes)
            break
          }
        }
      }

      // Deliver the rest newest first, as one batch per replica.
      for (const replica of replicas) {
        const remaining = yield* missing(replica)
        yield* replica.deliver(remaining.reverse(), [remaining.length])
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
        replicas.map((replica) => Object.fromEntries(replica.storage)),
        replicas.map(() => Object.fromEntries(expected))
      )
    }, Effect.scoped),
    { arbitrary: { runs: 200 } }
  )
})
