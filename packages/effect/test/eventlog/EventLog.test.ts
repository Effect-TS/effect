import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, PubSub, Queue, Ref, Schema, SchemaGetter } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import { Reactivity } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { vi } from "vitest"

const UserPayload = Schema.Struct({
  id: Schema.String
})

const UserGroup = EventGroup.empty.add({
  tag: "UserCreated",
  primaryKey: (payload) => payload.id,
  payload: UserPayload
})

const schema = EventLog.schema(UserGroup)

const ItemPayload = Schema.Struct({ list: Schema.String, item: Schema.Number })
const ItemGroup = EventGroup.empty.add({
  tag: "ItemAdded",
  primaryKey: (payload) => payload.list,
  payload: ItemPayload
})
const UncompactedItemGroup = EventGroup.empty.add({
  tag: "ItemObserved",
  primaryKey: (payload) => payload.list,
  payload: ItemPayload
})
// Replay handlers also understand older payloads that the compactor cannot decode.
const CompactableItemGroup = EventGroup.empty.add({
  tag: "ItemAdded",
  primaryKey: (payload) => payload.list,
  payload: Schema.Struct({ ...ItemPayload.fields, compactable: Schema.Literal(true) })
})
const replayItems = Effect.fnUntraced(function*(
  events: ReadonlyArray<{
    readonly event: "ItemAdded" | "ItemObserved"
    readonly list?: string
    readonly opaque?: boolean
  }>
) {
  const handled = yield* Queue.unbounded<number>()
  const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
  const entries = yield* Effect.forEach(events, ({ event, list = "list-1", opaque }, item) =>
    Effect.gen(function*() {
      const id = EventJournal.makeEntryIdUnsafe({ msecs: 1000 })
      // Same-millisecond UUIDs sort opposite to remote sequence order.
      id.fill(0, 6)
      id[6] = 0x70
      id[8] = 0x80
      id[15] = events.length - item
      return new EventJournal.RemoteEntry({
        remoteSequence: item,
        entry: new EventJournal.Entry({
          id,
          event,
          primaryKey: list,
          payload: opaque
            ? yield* Schema.encodeUnknownEffect(ItemGroup.events.ItemAdded.payloadSchemaBinary)({ list, item })
            : yield* Schema.encodeUnknownEffect(CompactableItemGroup.events.ItemAdded.payloadSchemaBinary)({
              list,
              item,
              compactable: true
            })
        }, { disableChecks: true })
      })
    }))
  yield* Queue.offerAll(changes, entries)
  const remote = EventLogRemote.EventLogRemote.of({
    id: EventJournal.makeRemoteIdUnsafe(),
    changes: () => Effect.succeed(changes),
    write: () => Effect.void,
    whenAuthenticated: (effect) => effect
  })
  const handlers = Layer.mergeAll(
    EventLog.group(
      ItemGroup,
      (handlers) => handlers.handle("ItemAdded", ({ payload }) => Queue.offer(handled, payload.item))
    ),
    EventLog.group(
      UncompactedItemGroup,
      (handlers) => handlers.handle("ItemObserved", ({ payload }) => Queue.offer(handled, payload.item))
    ),
    EventLog.groupCompaction(
      CompactableItemGroup,
      ({ events, write }) =>
        Effect.forEach(
          events,
          (event) => write(event._tag, { ...event.payload, list: "replacement" }),
          { discard: true }
        )
    )
  ).pipe(Layer.provide(EventLog.layerRegistry))
  const layer = EventLog.layer(EventLog.schema(ItemGroup, UncompactedItemGroup), handlers).pipe(
    Layer.provide(EventJournal.layerMemory),
    Layer.provide(
      Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(Layer.provide(EventLogEncryption.layerSubtle))
    )
  )
  return yield* Effect.gen(function*() {
    const registry = yield* EventLog.Registry
    // Control only the randomness boundary: successive replacement UUIDs sort
    // opposite to compactor write order, without relying on chance or retries.
    let randomByte = 255
    const random = vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((bytes) => {
      new Uint8Array(bytes!.buffer, bytes!.byteOffset, bytes!.byteLength).fill(randomByte--)
      return bytes
    })
    return yield* registry.registerRemote(remote).pipe(
      Effect.andThen(Effect.forEach(events, () => Queue.take(handled))),
      Effect.ensuring(Effect.sync(() => random.mockRestore()))
    )
  }).pipe(Effect.provide(layer))
})

const CurrentUserGroup = EventGroup.empty.add({
  tag: "UserCreated",
  primaryKey: (payload) => payload.id,
  payload: Schema.Struct({ id: Schema.String, name: Schema.String })
})

const makeCompactionEntry = Effect.fnUntraced(function*(payload: { readonly id: string; readonly name?: string }) {
  const payloadSchema = payload.name === undefined
    ? UserGroup.events.UserCreated.payloadSchemaBinary
    : CurrentUserGroup.events.UserCreated.payloadSchemaBinary
  return new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe(),
    event: "UserCreated",
    primaryKey: payload.id,
    payload: yield* Schema.encodeUnknownEffect(payloadSchema)(payload)
  }, { disableChecks: true })
})

const handlerLayer = (handled: Ref.Ref<ReadonlyArray<string>>) =>
  EventLog.group(
    UserGroup,
    (handlers) =>
      handlers.handle("UserCreated", ({ payload }) => Ref.update(handled, (values) => [...values, payload.id]))
  ).pipe(
    Layer.provide(EventLog.layerRegistry)
  )

const logLayer = (
  handled: Ref.Ref<ReadonlyArray<string>>,
  journalLayer: Layer.Layer<EventJournal.EventJournal> = EventJournal.layerMemory
) =>
  EventLog.layer(schema, handlerLayer(handled)).pipe(
    Layer.provide(journalLayer),
    Layer.provide(
      Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(
        Layer.provide(EventLogEncryption.layerSubtle)
      )
    )
  )

describe("EventLog", () => {
  it.effect("decodes shared conflicts once per remote replay batch", () =>
    Effect.gen(function*() {
      const decoded: Array<number> = []
      const group = EventGroup.empty.add({
        tag: "ItemAdded",
        primaryKey: (payload) => payload.list,
        payload: ItemPayload.pipe(Schema.decode({
          decode: SchemaGetter.transformEffect((payload) =>
            Effect.sync(() => {
              decoded.push(payload.item)
              return payload
            })
          ),
          encode: SchemaGetter.passthrough()
        }))
      })
      const handled = yield* Queue.unbounded<{ readonly item: number; readonly conflicts: ReadonlyArray<number> }>()
      const handlers = EventLog.group(group, (handlers) =>
        handlers.handle("ItemAdded", ({ conflicts, payload }) =>
          Queue.offer(handled, {
            item: payload.item,
            conflicts: conflicts.map(({ payload }) =>
              payload.item
            )
          }))).pipe(Layer.provide(EventLog.layerRegistry))
      const layer = EventLog.layer(EventLog.schema(group), handlers).pipe(
        Layer.provideMerge(EventJournal.layerMemory),
        Layer.provide(
          Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(Layer.provide(EventLogEncryption.layerSubtle))
        )
      )
      const makeEntry = Effect.fnUntraced(function*(item: number, msecs: number) {
        return new EventJournal.Entry({
          id: EventJournal.makeEntryIdUnsafe({ msecs }),
          event: "ItemAdded",
          primaryKey: "list-1",
          payload: yield* Schema.encodeUnknownEffect(ItemGroup.events.ItemAdded.payloadSchemaBinary)({
            list: "list-1",
            item
          })
        }, { disableChecks: true })
      })

      yield* Effect.gen(function*() {
        const journal = yield* EventJournal.EventJournal
        const registry = yield* EventLog.Registry
        const remoteId = EventJournal.makeRemoteIdUnsafe()
        // Both stored entries are newer than every incoming entry.
        yield* journal.writeFromRemote({
          remoteId,
          entries: [
            new EventJournal.RemoteEntry({ remoteSequence: 0, entry: yield* makeEntry(10, 2000) }),
            new EventJournal.RemoteEntry({ remoteSequence: 1, entry: yield* makeEntry(11, 3000) })
          ],
          effect: () => Effect.void
        })
        const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
        // Enqueue before registration so these entries are consumed as one batch.
        yield* Queue.offerAll(changes, [
          new EventJournal.RemoteEntry({ remoteSequence: 2, entry: yield* makeEntry(0, 1000) }),
          new EventJournal.RemoteEntry({ remoteSequence: 3, entry: yield* makeEntry(1, 1001) })
        ])
        yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
          id: remoteId,
          changes: () => Effect.succeed(changes),
          write: () => Effect.void,
          whenAuthenticated: (effect) => effect
        }))
        const first = [yield* Queue.take(handled), yield* Queue.take(handled)]
        const firstDecodes = decoded.splice(0).sort((a, b) => a - b)

        yield* Queue.offer(
          changes,
          new EventJournal.RemoteEntry({
            remoteSequence: 4,
            entry: yield* makeEntry(2, 1002)
          })
        )
        const second = yield* Queue.take(handled)
        assert.deepStrictEqual([...first, second], [
          { item: 0, conflicts: [10, 11] },
          { item: 1, conflicts: [10, 11] },
          { item: 2, conflicts: [10, 11] }
        ])
        // Reuse within a batch, but decode again in the next batch.
        assert.deepStrictEqual([firstDecodes, decoded.sort((a, b) => a - b)], [
          [0, 1, 10, 11],
          [2, 10, 11]
        ])
      }).pipe(Effect.provide(layer))
    }))

  it.effect("replays compacted outputs in compactor write order", () =>
    Effect.gen(function*() {
      const handled = yield* replayItems([{ event: "ItemAdded" }, { event: "ItemAdded" }])
      assert.deepStrictEqual(handled, [0, 1])
    }), { concurrent: false })

  it.effect(
    "replays a mixed same-millisecond batch at source positions even when replacement keys change",
    () =>
      Effect.gen(function*() {
        const handled = yield* replayItems([
          { event: "ItemAdded", list: "a" },
          { event: "ItemAdded", list: "b", opaque: true },
          { event: "ItemObserved" },
          { event: "ItemObserved" },
          { event: "ItemAdded", list: "b" }
        ])
        // The opaque b entry stays between sources; b replacements belong at
        // the first decoded b source, not the opaque entry or group start.
        assert.deepStrictEqual(handled, [0, 1, 2, 3, 4])
      }),
    { concurrent: false }
  )

  it.effect("compacts valid events while preserving undecodable entries unchanged", () =>
    Effect.gen(function*() {
      const first = yield* makeCompactionEntry({ id: "user-1", name: "before" })
      const opaque = yield* makeCompactionEntry({ id: "user-1" })
      const last = yield* makeCompactionEntry({ id: "user-1", name: "after" })
      const seen = yield* Ref.make<ReadonlyArray<unknown>>([])
      const compaction = EventLog.groupCompaction(CurrentUserGroup, ({ events, write }) =>
        Ref.update(seen, (values) => [...values, events]).pipe(
          Effect.andThen(write("UserCreated", events[events.length - 1].payload))
        ))

      yield* Effect.gen(function*() {
        const registry = yield* EventLog.Registry
        const compactor = registry.compactors.get("UserCreated")!
        const output: Array<EventJournal.Entry> = []
        yield* compactor.effect({
          entries: [first, opaque, last],
          write: (entry) =>
            Effect.sync(() => {
              output.push(entry)
            })
        })

        assert.deepStrictEqual(yield* Ref.get(seen), [[
          { _tag: "UserCreated", payload: { id: "user-1", name: "before" } },
          { _tag: "UserCreated", payload: { id: "user-1", name: "after" } }
        ]])
        assert.strictEqual(output.length, 2)
        const preserved = output.find((entry) =>
          entry.idString === opaque.idString
        )
        assert.strictEqual(preserved, opaque)
        assert.deepStrictEqual(preserved?.payload, opaque.payload)
        const replacement = output.find((entry) => entry !== opaque)!
        assert.strictEqual(replacement.event, "UserCreated")
        assert.strictEqual(replacement.primaryKey, "user-1")
        assert.deepStrictEqual(
          yield* Schema.decodeUnknownEffect(CurrentUserGroup.events.UserCreated.payloadSchemaBinary)(
            replacement.payload
          ),
          { id: "user-1", name: "after" }
        )
      }).pipe(Effect.provide(compaction.pipe(Layer.provideMerge(EventLog.layerRegistry))))
    }))

  it.effect("preserves all undecodable entries without invoking the group compactor", () =>
    Effect.gen(function*() {
      const entries = [
        yield* makeCompactionEntry({ id: "user-1" }),
        yield* makeCompactionEntry({ id: "user-2" })
      ]
      const calls = yield* Ref.make(0)
      const compaction = EventLog.groupCompaction(CurrentUserGroup, () => Ref.update(calls, (count) => count + 1))

      yield* Effect.gen(function*() {
        const registry = yield* EventLog.Registry
        const output: Array<EventJournal.Entry> = []
        yield* registry.compactors.get("UserCreated")!.effect({
          entries,
          write: (entry) =>
            Effect.sync(() => {
              output.push(entry)
            })
        })

        assert.strictEqual(yield* Ref.get(calls), 0)
        assert.strictEqual(output.length, entries.length)
        for (let i = 0; i < entries.length; i++) {
          assert.strictEqual(output[i], entries[i])
          assert.deepStrictEqual(output[i].payload, entries[i].payload)
        }
      }).pipe(Effect.provide(compaction.pipe(Layer.provideMerge(EventLog.layerRegistry))))
    }))

  it.effect("writes a typed event, commits the entry, and runs its handler", () =>
    Effect.gen(function*() {
      const handled = yield* Ref.make<ReadonlyArray<string>>([])
      return yield* Effect.gen(function*() {
        const log = yield* EventLog.EventLog
        yield* log.write({
          schema,
          event: "UserCreated",
          payload: { id: "user-1" }
        })
        const entries = yield* log.entries
        const seen = yield* Ref.get(handled)
        assert.strictEqual(entries.length, 1)
        assert.strictEqual(entries[0].event, "UserCreated")
        assert.deepStrictEqual(seen, ["user-1"])
      }).pipe(Effect.provide(logLayer(handled)))
    }))

  it.effect("writes a batch of events under one lock and handler transaction and returns results in order", () =>
    Effect.gen(function*() {
      const timeline: Array<string> = []
      const RenameGroup = EventGroup.empty.add({
        tag: "UserRenamed",
        primaryKey: (payload) => payload.id,
        payload: UserPayload,
        success: Schema.String,
        error: Schema.String
      })
      const renameSchema = EventLog.schema(RenameGroup)
      const handlers = EventLog.group(
        RenameGroup,
        (handlers) =>
          handlers.handle("UserRenamed", ({ payload }) =>
            Effect.gen(function*() {
              timeline.push(`handle ${payload.id}`)
              if (payload.id === "rejected") return yield* Effect.fail("rejected")
              return payload.id.toUpperCase()
            }))
      ).pipe(
        Layer.merge(EventLog.groupReactivity(RenameGroup, ["users"])),
        Layer.provide(EventLog.layerRegistry)
      )
      const journal = Layer.effect(
        EventJournal.EventJournal,
        Effect.map(EventJournal.makeMemory, (journal) =>
          EventJournal.EventJournal.of({
            ...journal,
            withLock: (storeId) => (effect) =>
              Effect.sync(() => timeline.push("lock")).pipe(
                Effect.andThen(journal.withLock(storeId)(effect)),
                Effect.ensuring(Effect.sync(() => timeline.push("unlock")))
              )
          }))
      )
      const layer = EventLog.layer(renameSchema, handlers).pipe(
        Layer.provide([
          journal,
          Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(Layer.provide(EventLogEncryption.layerSubtle)),
          Layer.succeed(EventLog.HandlerTransaction, (effect) =>
            Effect.sync(() => timeline.push("begin")).pipe(
              Effect.andThen(effect),
              Effect.ensuring(Effect.sync(() => timeline.push("commit")))
            ))
        ]),
        Layer.merge(Reactivity.layer)
      )
      return yield* Effect.gen(function*() {
        const log = yield* EventLog.EventLog
        const reactivity = yield* Reactivity.Reactivity
        reactivity.registerUnsafe(["users"], () => {
          timeline.push("invalidate")
        })
        const results = yield* log.writeMany({
          schema: renameSchema,
          events: [
            { event: "UserRenamed", payload: { id: "a" } },
            { event: "UserRenamed", payload: { id: "b" } },
            { event: "UserRenamed", payload: { id: "c" } }
          ]
        })
        const batch = timeline.splice(0)
        const single = yield* log.write({ schema: renameSchema, event: "UserRenamed", payload: { id: "d" } })
        const singleTimeline = timeline.splice(0)
        const failed = yield* Effect.flip(log.writeMany({
          schema: renameSchema,
          events: [
            { event: "UserRenamed", payload: { id: "e" } },
            { event: "UserRenamed", payload: { id: "rejected" } }
          ]
        }))
        // Subscribers are notified once per batch, after the handler
        // transaction commits and the journal lock is released. A failed batch
        // commits none of its events.
        assert.deepStrictEqual({
          results,
          batch,
          single,
          singleTimeline,
          failed,
          committed: (yield* log.entries).map((entry) => entry.primaryKey)
        }, {
          results: ["A", "B", "C"],
          batch: ["lock", "begin", "handle a", "handle b", "handle c", "commit", "unlock", "invalidate"],
          single: "D",
          singleTimeline: ["lock", "begin", "handle d", "commit", "unlock", "invalidate"],
          failed: "rejected",
          committed: ["a", "b", "c", "d"]
        })
      }).pipe(Effect.provide(layer))
    }))

  it.effect("replays each remote batch inside one handler transaction and invalidates once per batch", () =>
    Effect.gen(function*() {
      const timeline: Array<string> = []
      const invalidated = yield* Queue.unbounded<void>()
      const handlers = EventLog.group(
        UserGroup,
        (handlers) =>
          handlers.handle("UserCreated", ({ payload }) =>
            Effect.gen(function*() {
              timeline.push(`handle ${payload.id}`)
              if (payload.id === "user-1") return yield* Effect.die("handler failed")
            }))
      ).pipe(
        Layer.merge(EventLog.groupReactivity(UserGroup, ["users"])),
        Layer.provide(EventLog.layerRegistry)
      )
      const layer = EventLog.layer(schema, handlers).pipe(
        Layer.provide([
          EventJournal.layerMemory,
          Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(Layer.provide(EventLogEncryption.layerSubtle)),
          Layer.succeed(EventLog.HandlerTransaction, (effect) =>
            Effect.sync(() => timeline.push("begin")).pipe(
              Effect.andThen(effect),
              Effect.ensuring(Effect.sync(() => timeline.push("commit")))
            ))
        ]),
        Layer.merge(Reactivity.layer)
      )
      return yield* Effect.gen(function*() {
        const log = yield* EventLog.EventLog
        const reactivity = yield* Reactivity.Reactivity
        const registry = yield* EventLog.Registry
        reactivity.registerUnsafe(["users"], () => {
          timeline.push("invalidate")
          Queue.offerUnsafe(invalidated, undefined)
        })
        const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
        let remoteSequence = 0
        const offer = (entries: ReadonlyArray<EventJournal.Entry>) =>
          Queue.offerAll(
            changes,
            entries.map((entry) => new EventJournal.RemoteEntry({ remoteSequence: remoteSequence++, entry }))
          )
        const users = yield* Effect.forEach(
          ["user-1", "user-2", "user-3"],
          (id) => makeCompactionEntry({ id })
        )

        yield* offer(users.slice(0, 2))
        yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
          id: EventJournal.makeRemoteIdUnsafe(),
          changes: () => Effect.succeed(changes),
          write: () => Effect.void,
          whenAuthenticated: (effect) => effect
        }))
        yield* Queue.take(invalidated)
        // The remote echoes the first batch back alongside a new entry.
        yield* offer(users)
        yield* Queue.take(invalidated)

        // A failed handler is logged and its batch still commits; duplicates
        // invalidate with their batch rather than once per entry.
        assert.deepStrictEqual(timeline, [
          "begin",
          "handle user-1",
          "handle user-2",
          "commit",
          "invalidate",
          "begin",
          "handle user-3",
          "commit",
          "invalidate"
        ])
        assert.deepStrictEqual(
          (yield* log.entries).map((entry) => entry.primaryKey),
          ["user-1", "user-2", "user-3"]
        )
      }).pipe(Effect.provide(layer))
    }))

  it.effect("resumes remote changes from the committed sequence without duplicate writes or invalidations", () =>
    Effect.gen(function*() {
      const handled = yield* Ref.make<ReadonlyArray<string>>([])
      const offered: Array<ReadonlyArray<string>> = []
      const journalLayer = Layer.effect(
        EventJournal.EventJournal,
        Effect.map(EventJournal.makeMemory, (journal) =>
          EventJournal.EventJournal.of({
            ...journal,
            writeFromRemote: (options) =>
              Effect.sync(() => offered.push(options.entries.map(({ entry }) => entry.primaryKey))).pipe(
                Effect.andThen(journal.writeFromRemote(options))
              )
          }))
      )
      const layer = logLayer(handled, journalLayer).pipe(
        Layer.provide(EventLog.groupReactivity(UserGroup, ["users"]).pipe(Layer.provide(EventLog.layerRegistry))),
        Layer.merge(Reactivity.layer)
      )
      return yield* Effect.gen(function*() {
        const registry = yield* EventLog.Registry
        const reactivity = yield* Reactivity.Reactivity
        let invalidations = 0
        reactivity.registerUnsafe(["users"], () => {
          invalidations++
        })
        const entries = yield* Effect.forEach(
          ["user-1", "user-2"],
          (id, remoteSequence) =>
            Effect.map(makeCompactionEntry({ id }), (entry) => new EventJournal.RemoteEntry({ remoteSequence, entry }))
        )
        const attempts = yield* Queue.unbounded<number>()
        let connections = 0
        yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
          id: EventJournal.makeRemoteIdUnsafe(),
          changes: ({ startSequence }) =>
            Effect.gen(function*() {
              const changes = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
              connections++
              if (connections <= 2) {
                // A real remote sends only entries at or after the requested cursor.
                yield* Queue.offerAll(changes, entries.filter((entry) => entry.remoteSequence >= startSequence))
                // Buffered entries drain before the disconnection is observed.
                yield* Queue.fail(
                  changes,
                  new EventLogRemote.EventLogRemoteError({ method: "changes", cause: "offline" })
                )
              }
              yield* Queue.offer(attempts, startSequence)
              return changes
            }),
          write: () => Effect.void,
          whenAuthenticated: (effect) => effect
        }))

        const initial = yield* Queue.take(attempts)
        yield* TestClock.adjust("200 millis")
        const reconnect = yield* Queue.take(attempts)
        yield* TestClock.adjust("300 millis")
        const nextReconnect = yield* Queue.take(attempts)
        // The third connection is a barrier: both preceding streams have drained,
        // their journal transactions committed, and reactivity batches completed.
        assert.deepStrictEqual({
          startSequences: [initial, reconnect, nextReconnect],
          offered,
          invalidations,
          handled: yield* Ref.get(handled)
        }, {
          startSequences: [0, 2, 2],
          offered: [["user-1", "user-2"]],
          invalidations: 1,
          handled: ["user-1", "user-2"]
        })
      }).pipe(Effect.provide(layer))
    }))

  it.effect("retries a failed remote write and flushes changes made during the retry", () =>
    Effect.gen(function*() {
      const handled = yield* Ref.make<ReadonlyArray<string>>([])
      const subscriptions = yield* Queue.unbounded<PubSub.Subscription<EventJournal.Entry>>()
      const journalLayer = Layer.effect(
        EventJournal.EventJournal,
        EventJournal.makeMemory.pipe(
          Effect.map((journal) =>
            EventJournal.EventJournal.of({
              ...journal,
              changes: journal.changes.pipe(Effect.tap((subscription) => Queue.offer(subscriptions, subscription)))
            })
          )
        )
      )
      return yield* Effect.gen(function*() {
        const log = yield* EventLog.EventLog
        const registry = yield* EventLog.Registry
        const attempts = yield* Queue.unbounded<ReadonlyArray<EventJournal.Entry>>()
        const release = yield* Queue.unbounded<void>()
        let attempt = 0
        let failedChangeWrite = false
        const remote = EventLogRemote.EventLogRemote.of({
          id: EventJournal.makeRemoteIdUnsafe(),
          changes: () => Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>(),
          write: ({ entries }) =>
            Queue.offer(attempts, entries).pipe(
              Effect.flatMap(() => {
                attempt++
                if (attempt === 1) {
                  return Effect.fail(new EventLogRemote.EventLogRemoteError({ method: "write", cause: "offline" }))
                }
                if (attempt === 2) return Queue.take(release)
                if (!failedChangeWrite && entries.some((entry) => entry.primaryKey === "user-4")) {
                  failedChangeWrite = true
                  return Effect.fail(new EventLogRemote.EventLogRemoteError({ method: "write", cause: "offline" }))
                }
                return Effect.void
              })
            ),
          whenAuthenticated: (effect) => effect
        })

        yield* log.write({ schema, event: "UserCreated", payload: { id: "user-1" } })
        yield* registry.registerRemote(remote)
        const subscription = yield* Queue.take(subscriptions)
        const initial = yield* Queue.take(attempts)
        yield* TestClock.adjust("200 millis")
        const retry = yield* Queue.take(attempts)
        yield* log.write({ schema, event: "UserCreated", payload: { id: "user-2" } })
        yield* log.write({ schema, event: "UserCreated", payload: { id: "user-3" } })
        yield* Effect.yieldNow
        assert.strictEqual(yield* PubSub.remaining(subscription), 0)
        yield* Queue.offer(release, undefined)
        const afterChange = yield* Queue.take(attempts)
        yield* Effect.yieldNow
        assert.strictEqual(yield* Queue.size(attempts), 0)
        yield* log.write({ schema, event: "UserCreated", payload: { id: "user-4" } })
        const changeAttempt = yield* Queue.take(attempts)
        yield* TestClock.adjust("200 millis")
        const changeRetry = yield* Queue.take(attempts)

        assert.deepStrictEqual(retry.map((entry) => entry.idString), initial.map((entry) => entry.idString))
        assert.deepStrictEqual(afterChange.map((entry) => entry.primaryKey), ["user-2", "user-3"])
        assert.deepStrictEqual(changeAttempt.map((entry) => entry.primaryKey), ["user-4"])
        assert.deepStrictEqual(
          changeRetry.map((entry) => entry.idString),
          changeAttempt.map((entry) => entry.idString)
        )
      }).pipe(Effect.provide(logLayer(handled, journalLayer)))
    }))

  it.effect("encrypts and decrypts entries with a distinct IV per entry", () =>
    Effect.gen(function*() {
      const encryption = yield* EventLogEncryption.EventLogEncryption
      const identity = yield* encryption.generateIdentity
      const entries = ["user-1", "user-2"].map((primaryKey, index) =>
        new EventJournal.Entry({
          id: EventJournal.makeEntryIdUnsafe(),
          event: "UserCreated",
          primaryKey,
          payload: new Uint8Array([index])
        }, { disableChecks: true })
      )
      const encrypted = yield* encryption.encrypt(identity, entries)
      assert.notDeepEqual(encrypted[0].iv, encrypted[1].iv)
      const decrypted = yield* encryption.decrypt(
        identity,
        encrypted.map((entry, index) => ({ ...entry, sequence: index, entryId: entries[index].id }))
      )
      assert.deepStrictEqual(
        decrypted.map((remote) => remote.entry.idString),
        entries.map((entry) => entry.idString)
      )
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

  it.effect("publishes local journal changes through a scoped subscription", () =>
    Effect.gen(function*() {
      const remoteId = EventJournal.makeRemoteIdUnsafe()
      const journal = yield* EventJournal.EventJournal
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1])
      }, { disableChecks: true })

      const first = yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 1, entry })],
        effect: () => Effect.void
      })
      const second = yield* journal.writeFromRemote({
        remoteId,
        entries: [new EventJournal.RemoteEntry({ remoteSequence: 2, entry })],
        effect: () => Effect.void
      })

      assert.deepStrictEqual(first.duplicateEntries, [])
      assert.deepStrictEqual(second.duplicateEntries.map((_) => _.idString), [entry.idString])
    }).pipe(Effect.provide(EventJournal.layerMemory)))
})
