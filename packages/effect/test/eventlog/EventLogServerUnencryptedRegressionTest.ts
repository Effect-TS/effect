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
})
const event = group.events.Set
const makeEntry = Effect.fnUntraced(function*(msecs: number, key: string) {
  return new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event: event.tag,
    primaryKey: key,
    payload: yield* Schema.encodeUnknownEffect(event.payloadSchemaBinary)({ key })
  }, { disableChecks: true })
})

const makeClient = Effect.fnUntraced(function*(name: string) {
  const storage = yield* EventLogServerUnencrypted.Storage
  const registry = yield* EventLog.Registry.pipe(Effect.provide(EventLog.layerRegistry))
  const handled: Array<{ key: string; conflicts: ReadonlyArray<string> }> = []
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
  it.layer(Layer.merge(storage, EventLogEncryption.layerSubtle))(
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
    }
  )
