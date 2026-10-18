/**
 * Cryptographic service for encrypted event-log replication.
 *
 * `EventLogEncryption` turns local journal entries into encrypted remote
 * payloads and decrypts encrypted changes received from a server. It also
 * hashes byte data and creates event-log identities, so remote replication can
 * use storage or transport that should not see plaintext event data.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type { NonEmptyArray } from "../Array.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as SchemaBinary from "../encoding/SchemaBinary.ts"
import * as Layer from "../Layer.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import * as Transferable from "../workers/Transferable.ts"
import { type Entry, EntryFields, entryFromFields, EntryId, RemoteEntry } from "./EventJournal.ts"
import type { Identity } from "./EventLog.ts"
import { makeGetIdentityRootSecretMaterial } from "./internal/identityRootSecretDerivation.ts"

/**
 * Schema for a batch of journal entries encrypted as one AES-GCM message.
 *
 * **Details**
 *
 * `entryIds` lists the ids of the encrypted entries in order. It is sent in
 * plaintext so the server can deduplicate batches, and it is authenticated
 * together with the store id, so a server cannot alter it or move the batch to
 * another store.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export const EncryptedBatch = Schema.Struct({
  entryIds: Schema.NonEmptyArray(EntryId),
  iv: Transferable.Uint8Array,
  encryptedBatch: Transferable.Uint8Array
})

/**
 * Type of an encrypted batch.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface EncryptedBatch extends Schema.Schema.Type<typeof EncryptedBatch> {}

/**
 * Type of an encrypted batch stored by a remote server, including the remote
 * sequence of its first entry.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface EncryptedRemoteBatch extends Schema.Schema.Type<typeof EncryptedRemoteBatch> {}

/**
 * Schema for encrypted batches exchanged with a remote event-log server.
 *
 * **Details**
 *
 * The entries of a batch have consecutive remote sequences starting at
 * `sequence`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export const EncryptedRemoteBatch = Schema.Struct({
  sequence: Schema.Natural,
  ...EncryptedBatch.fields
})

const maxBatchEntries = 100
const maxBatchPayloadBytes = 256 * 1024

// A batch holds at most `maxBatchEntries` entries or `maxBatchPayloadBytes` of
// payload, whichever comes first. A single larger entry is a batch on its own.
const toBatches = (entries: ReadonlyArray<Entry>): Array<NonEmptyArray<Entry>> => {
  const batches: Array<NonEmptyArray<Entry>> = []
  let current: Array<Entry> = []
  let bytes = 0
  for (const entry of entries) {
    const size = entry.payload.byteLength
    if (current.length > 0 && (current.length === maxBatchEntries || bytes + size > maxBatchPayloadBytes)) {
      batches.push(current as NonEmptyArray<Entry>)
      current = []
      bytes = 0
    }
    current.push(entry)
    bytes += size
  }
  if (current.length > 0) batches.push(current as NonEmptyArray<Entry>)
  return batches
}

const textEncoder = new TextEncoder()

// The store id is length-prefixed, followed by the 16-byte entry ids.
const additionalData = (storeId: string, entryIds: ReadonlyArray<EntryId>): Uint8Array<ArrayBuffer> => {
  const store = textEncoder.encode(storeId)
  const data = new Uint8Array(4 + store.byteLength + entryIds.length * 16)
  new DataView(data.buffer).setUint32(0, store.byteLength)
  data.set(store, 4)
  let offset = 4 + store.byteLength
  for (const id of entryIds) {
    data.set(id, offset)
    offset += 16
  }
  return data
}

const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.byteLength !== b.byteLength) return false
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const BatchFromSchemaBinary = SchemaBinary.toCodec(Schema.NonEmptyArray(EntryFields))
const encodeBatch = Schema.encodeEffect(BatchFromSchemaBinary)
const decodeBatch = Schema.decodeEffect(BatchFromSchemaBinary)

const toArrayBuffer = (data: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  return buffer
}

/**
 * Service that provides identity generation, entry
 * encryption and decryption, and SHA-256 hashing for event-log replication.
 *
 * **When to use**
 *
 * Use to provide cryptographic operations required by encrypted event-log
 * replication.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class EventLogEncryption extends Context.Service<EventLogEncryption, {
  readonly encrypt: (
    identity: Identity["Service"],
    storeId: string,
    entries: ReadonlyArray<Entry>
  ) => Effect.Effect<Array<EncryptedBatch>>
  readonly decrypt: (
    identity: Identity["Service"],
    storeId: string,
    batches: ReadonlyArray<EncryptedRemoteBatch>
  ) => Effect.Effect<Array<RemoteEntry>>
  readonly sha256String: (data: Uint8Array) => Effect.Effect<string>
  readonly sha256: (data: Uint8Array) => Effect.Effect<Uint8Array>
  readonly generateIdentity: Effect.Effect<Identity["Service"]>
}>()("effect/eventlog/EventLogEncryption") {}

/**
 * Creates an `EventLogEncryption` service backed by the Web Crypto `SubtleCrypto`
 * APIs from the supplied `Crypto` implementation.
 *
 * @stability unstable
 * @category encryption
 * @since 4.0.0
 */
export const makeEncryptionSubtle = (crypto: Crypto): Effect.Effect<EventLogEncryption["Service"]> =>
  Effect.sync(() => {
    const getIdentityRootSecretMaterial = makeGetIdentityRootSecretMaterial(crypto)

    return EventLogEncryption.of({
      encrypt: Effect.fnUntraced(function*(identity, storeId, entries) {
        const key = (yield* getIdentityRootSecretMaterial(identity)).encryptionKey
        const batches = toBatches(entries)
        const data = yield* Effect.orDie(Effect.forEach(batches, (batch) => encodeBatch(batch)))
        return yield* Effect.promise(() =>
          Promise.all(batches.map((batch, i) => {
            const entryIds = batch.map((entry) => entry.id) as NonEmptyArray<EntryId>
            const iv = crypto.getRandomValues(new Uint8Array(12))
            return crypto.subtle.encrypt(
              { name: "AES-GCM", iv, additionalData: additionalData(storeId, entryIds), tagLength: 128 },
              key,
              data[i]
            ).then((encryptedBatch) => ({ entryIds, iv, encryptedBatch: new Uint8Array(encryptedBatch) }))
          }))
        )
      }),
      decrypt: Effect.fnUntraced(function*(identity, storeId, batches) {
        const key = (yield* getIdentityRootSecretMaterial(identity)).encryptionKey
        const decrypted = yield* Effect.promise(() =>
          Promise.all(batches.map((batch) =>
            crypto.subtle.decrypt(
              {
                name: "AES-GCM",
                iv: batch.iv,
                additionalData: additionalData(storeId, batch.entryIds),
                tagLength: 128
              },
              key,
              batch.encryptedBatch
            )
          ))
        )
        const result: Array<RemoteEntry> = []
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          const fields = yield* Effect.orDie(decodeBatch(new Uint8Array(decrypted[i])))
          const entries = fields.map(entryFromFields)
          if (
            entries.length !== batch.entryIds.length ||
            entries.some((entry, j) => !equalBytes(entry.id, batch.entryIds[j]))
          ) {
            return yield* Effect.die(new Error("Encrypted batch entries do not match its entry ids"))
          }
          for (let j = 0; j < entries.length; j++) {
            result.push(new RemoteEntry({ remoteSequence: batch.sequence + j, entry: entries[j] }))
          }
        }
        return result
      }),
      sha256: (data) =>
        Effect.promise(() => crypto.subtle.digest("SHA-256", toArrayBuffer(data))).pipe(
          Effect.map((hash) => new Uint8Array(hash))
        ),
      sha256String: (data) =>
        Effect.map(
          Effect.promise(() => crypto.subtle.digest("SHA-256", toArrayBuffer(data))),
          (hash) => {
            const hashArray = Array.from(new Uint8Array(hash))
            const hashHex = hashArray
              .map((bytes) => bytes.toString(16).padStart(2, "0"))
              .join("")
            return hashHex
          }
        ),
      generateIdentity: Effect.sync(() => ({
        publicKey: crypto.randomUUID(),
        privateKey: Redacted.make(crypto.getRandomValues(new Uint8Array(32)))
      }))
    })
  })

/**
 * Provides `EventLogEncryption` using `globalThis.crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSubtle: Layer.Layer<EventLogEncryption> = Layer.effect(
  EventLogEncryption,
  makeEncryptionSubtle(globalThis.crypto)
)
