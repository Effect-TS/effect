import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, PubSub, Queue, Ref, Schema } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import { Reactivity } from "effect/reactivity"
import { TestClock } from "effect/testing"

const UserPayload = Schema.Struct({
  id: Schema.String
})

const UserGroup = EventGroup.empty.add({
  tag: "UserCreated",
  primaryKey: (payload) => payload.id,
  payload: UserPayload
})

const schema = EventLog.schema(UserGroup)

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
