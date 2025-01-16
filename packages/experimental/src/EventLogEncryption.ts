/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { Entry, EntryId, RemoteEntry } from "./EventJournal.js"
import type { Identity } from "./EventLog.js"

/**
 * @since 1.0.0
 * @category models
 */
export const EncryptedEntry = Schema.Struct({
  entryId: EntryId,
  encryptedEntry: Schema.Uint8ArrayFromSelf
})

/**
 * @since 1.0.0
 * @category models
 */
export interface EncryptedRemoteEntry extends Schema.Schema.Type<typeof EncryptedRemoteEntry> {}

/**
 * @since 1.0.0
 * @category models
 */
export const EncryptedRemoteEntry = Schema.Struct({
  sequence: Schema.Number,
  iv: Schema.Uint8ArrayFromSelf,
  entryId: EntryId,
  encryptedEntry: Schema.Uint8ArrayFromSelf
})

/**
 * @since 1.0.0
 * @category encrytion
 */
export class EventLogEncryption extends Context.Tag("@effect/experimental/EventLogEncryption")<
  EventLogEncryption,
  {
    readonly encrypt: (
      identity: typeof Identity.Service,
      entries: ReadonlyArray<Entry>
    ) => Effect.Effect<{
      readonly iv: Uint8Array
      readonly encryptedEntries: ReadonlyArray<Uint8Array>
    }>
    readonly decrypt: (
      identity: typeof Identity.Service,
      entries: ReadonlyArray<EncryptedRemoteEntry>
    ) => Effect.Effect<Array<RemoteEntry>>
    readonly sha256String: (data: Uint8Array) => Effect.Effect<string>
    readonly sha256: (data: Uint8Array) => Effect.Effect<Uint8Array>
  }
>() {}

/**
 * @since 1.0.0
 * @category encrytion
 */
export const makeEncryptionSubtle = (crypto: Crypto): Effect.Effect<typeof EventLogEncryption.Service> =>
  Effect.sync(() => {
    const keyCache = new WeakMap<typeof Identity.Service, CryptoKey>()
    const getKey = (identity: typeof Identity.Service) =>
      Effect.suspend(() => {
        if (keyCache.has(identity)) {
          return Effect.succeed(keyCache.get(identity)!)
        }
        return Effect.promise(() =>
          crypto.subtle.importKey(
            "raw",
            Redacted.value(identity.privateKey),
            "AES-GCM",
            true,
            ["encrypt", "decrypt"]
          )
        ).pipe(
          Effect.tap((key) => {
            keyCache.set(identity, key)
          })
        )
      })

    return EventLogEncryption.of({
      encrypt: (identity, entries) =>
        Effect.gen(function*() {
          const data = yield* Effect.orDie(Entry.encodeArray(entries))
          const key = yield* getKey(identity)
          const iv = crypto.getRandomValues(new Uint8Array(12))
          const encryptedEntries = yield* Effect.promise(() =>
            Promise.all(
              data.map((entry) => crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, entry))
            )
          )
          return {
            iv,
            encryptedEntries: encryptedEntries.map((entry) => new Uint8Array(entry))
          }
        }),
      decrypt: (identity, entries) =>
        Effect.gen(function*() {
          const key = yield* getKey(identity)
          const decryptedData = (yield* Effect.promise(() =>
            Promise.all(entries.map((data) =>
              crypto.subtle.decrypt(
                { name: "AES-GCM", iv: data.iv, tagLength: 128 },
                key,
                data.encryptedEntry
              )
            ))
          )).map((buffer) => new Uint8Array(buffer))
          const decoded = yield* Effect.orDie(Entry.decodeArray(decryptedData))
          return decoded.map((entry, i) => new RemoteEntry({ remoteSequence: entries[i].sequence, entry }))
        }),
      sha256: (data) =>
        Effect.promise(() => crypto.subtle.digest("SHA-256", data)).pipe(
          Effect.map((hash) => new Uint8Array(hash))
        ),
      sha256String: (data) =>
        Effect.map(
          Effect.promise(() => crypto.subtle.digest("SHA-256", data)),
          (hash) => {
            const hashArray = Array.from(new Uint8Array(hash))
            const hashHex = hashArray
              .map((bytes) => bytes.toString(16).padStart(2, "0"))
              .join("")
            return hashHex
          }
        )
    })
  })

/**
 * @since 1.0.0
 * @category encrytion
 */
export const layerSubtle: Layer.Layer<EventLogEncryption> = Layer.suspend(() =>
  Layer.effect(EventLogEncryption, makeEncryptionSubtle(globalThis.crypto))
)
