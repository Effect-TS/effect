import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Ref, Schema } from "effect"
import * as EventGroup from "effect/unstable/eventlog/EventGroup"
import * as EventJournal from "effect/unstable/eventlog/EventJournal"
import * as EventLog from "effect/unstable/eventlog/EventLog"
import * as EventLogEncryption from "effect/unstable/eventlog/EventLogEncryption"

const UserPayload = Schema.Struct({
  id: Schema.String
})

const UserGroup = EventGroup.empty.add({
  tag: "UserCreated",
  primaryKey: (payload) => payload.id,
  payload: UserPayload
})

const schema = EventLog.schema(UserGroup)

const handlerLayer = (handled: Ref.Ref<ReadonlyArray<string>>) =>
  EventLog.group(
    UserGroup,
    (handlers) =>
      handlers.handle("UserCreated", ({ payload }) => Ref.update(handled, (values) => [...values, payload.id]))
  ).pipe(
    Layer.provide(EventLog.layerRegistry)
  )

const logLayer = (handled: Ref.Ref<ReadonlyArray<string>>) =>
  EventLog.layer(schema, handlerLayer(handled)).pipe(
    Layer.provide(EventJournal.layerMemory),
    Layer.provide(
      Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(
        Layer.provide(EventLogEncryption.layerSubtle)
      )
    )
  )

describe("EventLog", () => {
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

  it.effect("encrypts and decrypts entries", () =>
    Effect.gen(function*() {
      const encryption = yield* EventLogEncryption.EventLogEncryption
      const identity = yield* encryption.generateIdentity
      const entry = new EventJournal.Entry({
        id: EventJournal.makeEntryIdUnsafe(),
        event: "UserCreated",
        primaryKey: "user-1",
        payload: new Uint8Array([1, 2, 3])
      }, { disableChecks: true })
      const encrypted = yield* encryption.encrypt(identity, [entry])
      const decrypted = yield* encryption.decrypt(identity, [{
        sequence: 0,
        iv: encrypted[0].iv,
        entryId: entry.id,
        encryptedEntry: encrypted[0].encryptedEntry
      }])
      assert.strictEqual(decrypted.length, 1)
      assert.strictEqual(decrypted[0].entry.idString, entry.idString)
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

  it.effect("uses a distinct AES-GCM IV for each entry", () =>
    Effect.gen(function*() {
      const ivs: Array<Array<number>> = []
      const subtle = new Proxy(globalThis.crypto.subtle, {
        get(target, property) {
          if (property === "encrypt") {
            return (algorithm: AesGcmParams, key: CryptoKey, data: BufferSource) => {
              const iv = algorithm.iv as ArrayBufferView<ArrayBuffer>
              ivs.push(Array.from(new Uint8Array(iv.buffer, iv.byteOffset, iv.byteLength)))
              return target.encrypt(algorithm, key, data)
            }
          }
          const value = Reflect.get(target, property, target)
          return typeof value === "function" ? value.bind(target) : value
        }
      })
      const encryption = yield* EventLogEncryption.makeEncryptionSubtle({
        subtle,
        getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
        randomUUID: globalThis.crypto.randomUUID.bind(globalThis.crypto)
      } as Crypto)
      const identity = yield* encryption.generateIdentity
      const entries = ["user-1", "user-2"].map((primaryKey, index) =>
        new EventJournal.Entry({
          id: EventJournal.makeEntryIdUnsafe(),
          event: "UserCreated",
          primaryKey,
          payload: new Uint8Array([index])
        }, { disableChecks: true })
      )

      yield* encryption.encrypt(identity, entries)

      assert.lengthOf(ivs, 2)
      assert.notDeepEqual(ivs[0], ivs[1])
    }))

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
