import { assert, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Redacted, Schema } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogMessage from "effect/eventlog/EventLogMessage"
import * as EventLogServerUnencrypted from "effect/eventlog/EventLogServerUnencrypted"
import * as EventLogSessionAuth from "effect/eventlog/EventLogSessionAuth"
import { makeGetIdentityRootSecretMaterial } from "effect/eventlog/internal/identityRootSecretDerivation"
import * as RpcTest from "effect/rpc/RpcTest"

const group = EventGroup.empty.add({
  tag: "Set",
  primaryKey: (payload) => payload.key,
  payload: Schema.Struct({ key: Schema.String })
}).add({
  tag: "Other",
  primaryKey: (payload) => payload.key,
  payload: Schema.Struct({ key: Schema.String })
})
export const makeEntry = Effect.fnUntraced(function*(msecs: number, key: string, tag: "Set" | "Other" = "Set") {
  return new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event: tag,
    primaryKey: key,
    payload: yield* Schema.encodeUnknownEffect(group.events[tag].payloadSchemaBinary)({ key })
  }, { disableChecks: true })
})

export const makeClient = Effect.fnUntraced(function*(name: string) {
  const storage = yield* EventLogServerUnencrypted.Storage
  const registry = yield* EventLog.Registry.pipe(Effect.provide(EventLog.layerRegistry))
  const handled: Array<{ key: string; conflicts: ReadonlyArray<string> }> = []
  for (const event of [group.events.Set, group.events.Other]) {
    registry.registerHandlerUnsafe({
      event: event.tag,
      handler: {
        event,
        context: Context.empty() as Context.Context<any>,
        handler: ({ entry, conflicts }) =>
          Effect.sync(() => {
            handled.push({ key: entry.primaryKey, conflicts: conflicts.map(({ entry }) => entry.idString) })
          })
      }
    })
  }
  const client = yield* RpcTest.makeClient(EventLogMessage.EventLogRemoteRpcs).pipe(
    Effect.provide(EventLogServerUnencrypted.layerRpcHandlers.pipe(
      Layer.provide(Layer.succeed(EventLogServerUnencrypted.Storage, storage)),
      Layer.provide(Layer.succeed(EventLog.Registry, registry)),
      Layer.provide(Layer.succeed(EventLogServerUnencrypted.StoreMapping, {
        resolve: ({ storeId }) => Effect.succeed(storeId),
        hasStore: () => Effect.succeed(true)
      })),
      Layer.provide(Layer.succeed(EventLogServerUnencrypted.EventLogServerAuthorization, {
        authorizeWrite: () => Effect.void,
        authorizeRead: () => Effect.void,
        authorizeIdentity: () => Effect.void
      }))
    ))
  )
  const identity = yield* EventLog.makeIdentity
  const hello = yield* client["EventLog.Hello"]()
  const material = yield* makeGetIdentityRootSecretMaterial(globalThis.crypto)(identity)
  const signature = yield* EventLogSessionAuth.signSessionAuthPayload({
    remoteId: hello.remoteId,
    challenge: hello.challenge,
    publicKey: identity.publicKey,
    signingPublicKey: material.signingPublicKey,
    signingPrivateKey: Redacted.value(material.signingPrivateKey)
  })
  yield* client["EventLog.Authenticate"](
    new EventLogMessage.Authenticate({
      publicKey: identity.publicKey,
      signingPublicKey: material.signingPublicKey,
      signature,
      algorithm: "Ed25519"
    })
  )
  const write = Effect.fnUntraced(function*(entries: [EventJournal.Entry, ...Array<EventJournal.Entry>]) {
    const data = yield* new EventLogMessage.WriteEntriesUnencrypted({
      publicKey: identity.publicKey,
      storeId: EventLogMessage.StoreId.make(name),
      entries
    }).encoded
    yield* client["EventLog.WriteSingle"]({ data })
  })
  return { write, handled }
})

export const suite = (name: string, storage: Layer.Layer<EventLogServerUnencrypted.Storage, unknown>) =>
  it.layer(Layer.merge(storage, EventLogEncryption.layerSubtle), { timeout: "30 seconds" })(
    `Unencrypted write ordering (${name})`,
    (it) => {
      it.effect("acknowledges an out-of-order duplicate without invoking its handler", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("out-of-order")
          const older = yield* makeEntry(1_000, "older")
          const newer = yield* makeEntry(2_000, "newer")
          yield* write([newer])
          yield* write([older])
          const result = yield* Effect.exit(write([older]))
          assert.deepStrictEqual({ acknowledged: Exit.isSuccess(result), calls: handled.length }, {
            acknowledged: true,
            calls: 2
          })
        }))

      it.effect("skips all equal-timestamp duplicates in a retried batch", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("equal-timestamps")
          const entries = [yield* makeEntry(1_000, "a"), yield* makeEntry(1_000, "b")]
            .sort(EventJournal.Entry.Order)
          assert.notStrictEqual(entries[0].idString, entries[1].idString)
          yield* write([entries[0], entries[1]])
          const result = yield* Effect.exit(write([entries[0], entries[1]]))
          assert.deepStrictEqual({ acknowledged: Exit.isSuccess(result), calls: handled.length }, {
            acknowledged: true,
            calls: 2
          })
        }))

      it.effect("reports only newer same-key conflicts regardless of storage order", () =>
        Effect.gen(function*() {
          const x = yield* makeEntry(1_200, "a")
          const y = yield* makeEntry(2_000, "b")
          const z = yield* makeEntry(2_500, "a")
          const v = yield* makeEntry(1_100, "c")
          const w = yield* makeEntry(1_500, "a")
          const results = []
          for (const [index, history] of [[x, y, z], [y, x, z]].entries()) {
            const { write, handled } = yield* makeClient(`conflicts-${index}`)
            for (const entry of history) yield* write([entry])
            handled.length = 0
            yield* write([v, w])
            results.push(handled)
          }
          assert.deepStrictEqual(results, [
            [{ key: "c", conflicts: [] }, { key: "a", conflicts: [z.idString] }],
            [{ key: "c", conflicts: [] }, { key: "a", conflicts: [z.idString] }]
          ])
        }))

      it.effect("ignores same-key entries from a different event", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("different-event")
          const storedOther = yield* makeEntry(2_000, "a", "Other")
          const storedSet = yield* makeEntry(3_000, "a")
          yield* write([storedOther])
          yield* write([storedSet])
          handled.length = 0
          yield* write([yield* makeEntry(1_000, "a"), yield* makeEntry(1_500, "a", "Other")])
          assert.deepStrictEqual(handled, [
            { key: "a", conflicts: [storedSet.idString] },
            { key: "a", conflicts: [storedOther.idString] }
          ])
        }))

      it.effect("reports equal-timestamp conflicts by entry id order and batch start", () =>
        Effect.gen(function*() {
          const [lower, stored, higher] = [
            yield* makeEntry(1_000, "a"),
            yield* makeEntry(1_000, "a"),
            yield* makeEntry(1_000, "a")
          ].sort(EventJournal.Entry.Order)
          const results = []
          const batches: Array<[EventJournal.Entry, ...Array<EventJournal.Entry>]> = [[lower], [higher], [
            lower,
            higher
          ]]
          for (const [index, batch] of batches.entries()) {
            const { write, handled } = yield* makeClient(`equal-timestamp-conflicts-${index}`)
            yield* write([stored])
            handled.length = 0
            yield* write(batch)
            results.push(handled.map(({ conflicts }) => conflicts))
          }
          // History is read from the batch's lowest entry id, so a stored entry
          // with the same timestamp and a lower id conflicts with `higher` only
          // when `lower` is in the same batch.
          assert.deepStrictEqual(results, [
            [[stored.idString]],
            [[]],
            [[stored.idString], [stored.idString]]
          ])
        }))

      it.effect("applies the batch's lowest id to every lookup in a large batch", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("large-batch")
          const entries: Array<EventJournal.Entry> = []
          for (let i = 0; i < 252; i++) entries.push(yield* makeEntry(1_000, "x"))
          entries.sort(EventJournal.Entry.Order)
          // `stored` sorts between the batch's first and last entries and only
          // shares a key with the last, so every lookup must start from the
          // batch's lowest id.
          const withKeyB = ({ event, id, payload }: EventJournal.Entry) =>
            new EventJournal.Entry({ id, event, primaryKey: "b", payload }, { disableChecks: true })
          const stored = withKeyB(entries[1])
          const last = withKeyB(entries[251])
          yield* write([stored])
          handled.length = 0
          yield* write([entries[0], ...entries.slice(2, 251), last])
          assert.deepStrictEqual(handled.at(-1), { key: "b", conflicts: [stored.idString] })
        }))

      it.effect("matches long primary keys exactly", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("long-keys")
          const prefix = Array.from({ length: 125 }, () => crypto.randomUUID()).join("")
          const stored = yield* makeEntry(2_000, `${prefix}a`)
          yield* write([stored])
          handled.length = 0
          yield* write([yield* makeEntry(1_000, `${prefix}a`), yield* makeEntry(1_500, `${prefix}b`)])
          assert.deepStrictEqual(handled.map(({ conflicts }) => conflicts), [[stored.idString], []])
        }))

      it.effect("skips a stored duplicate inside a mixed batch and persists the rest", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("mixed-duplicate")
          const stored = yield* makeEntry(2_000, "a")
          const before = yield* makeEntry(1_000, "a")
          const after = yield* makeEntry(2_500, "a")
          yield* write([stored])
          handled.length = 0
          yield* write([before, stored, after])
          yield* write([yield* makeEntry(500, "a")])
          assert.deepStrictEqual(handled, [
            { key: "a", conflicts: [stored.idString] },
            { key: "a", conflicts: [] },
            { key: "a", conflicts: [stored.idString, before.idString, after.idString] }
          ])
        }))

      it.effect("does not report conflicts between entries of the same batch", () =>
        Effect.gen(function*() {
          const { write, handled } = yield* makeClient("same-batch")
          const sameMillis = [yield* makeEntry(1_000, "a"), yield* makeEntry(1_000, "a")]
          yield* write([yield* makeEntry(2_000, "a"), ...sameMillis])
          assert.deepStrictEqual(handled.map(({ conflicts }) => conflicts), [[], [], []])
        }))
    }
  )
