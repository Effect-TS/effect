/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as RcMap from "effect/RcMap"
import * as Redacted from "effect/Redacted"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import { Entry, EntryId, RemoteEntry, RemoteId } from "./EventJournal.js"
import type { Identity } from "./EventLog.js"
import { EventLog } from "./EventLog.js"
import * as MsgPack from "./MsgPack.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface EventLogRemote {
  readonly id: RemoteId
  readonly changes: (
    identity: typeof Identity.Service,
    startSequence: number
  ) => Effect.Effect<Mailbox.ReadonlyMailbox<RemoteEntry>, never, Scope>
  readonly write: (identity: typeof Identity.Service, entries: ReadonlyArray<Entry>) => Effect.Effect<void>
  readonly remove: (identity: typeof Identity.Service, ids: Iterable<EntryId>) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category protocol
 */
export class Hello extends Schema.TaggedClass<Hello>("@effect/experimental/EventLogRemote/Hello")("Hello", {
  remoteId: RemoteId
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export const EncryptedEntry = Schema.Struct({
  entryId: EntryId,
  encryptedEntry: Schema.Uint8ArrayFromSelf
})

/**
 * @since 1.0.0
 * @category protocol
 */
export class WriteEntries
  extends Schema.TaggedClass<WriteEntries>("@effect/experimental/EventLogRemote/WriteEntries")("WriteEntries", {
    publicKey: Schema.String,
    id: Schema.Number,
    iv: Schema.Uint8ArrayFromSelf,
    encryptedEntries: Schema.Array(EncryptedEntry)
  })
{}

/**
 * @since 1.0.0
 * @category protocol
 */
export class RemoveEntries
  extends Schema.TaggedClass<RemoveEntries>("@effect/experimental/EventLogRemote/RemoveEntries")("RemoveEntries", {
    publicKey: Schema.String,
    id: Schema.Number,
    entryIds: Schema.Array(EntryId)
  })
{}

/**
 * @since 1.0.0
 * @category protocol
 */
export class Ack extends Schema.TaggedClass<Ack>("@effect/experimental/EventLogRemote/Ack")("Ack", {
  id: Schema.Number
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export class RequestChanges
  extends Schema.TaggedClass<RequestChanges>("@effect/experimental/EventLogRemote/RequestChanges")("RequestChanges", {
    publicKey: Schema.String,
    subscriptionId: Schema.Number,
    startSequence: Schema.Number
  })
{}

/**
 * @since 1.0.0
 * @category protocol
 */
export interface EncryptedRemoteEntry extends Schema.Schema.Type<typeof EncryptedRemoteEntry> {}

/**
 * @since 1.0.0
 * @category protocol
 */
export const EncryptedRemoteEntry = Schema.Struct({
  sequence: Schema.Number,
  iv: Schema.Uint8ArrayFromSelf,
  entryId: EntryId,
  encryptedEntry: Schema.Uint8ArrayFromSelf
})

/**
 * @since 1.0.0
 * @category protocol
 */
export class Additions
  extends Schema.TaggedClass<Additions>("@effect/experimental/EventLogRemote/Additions")("Additions", {
    entries: Schema.Array(EncryptedRemoteEntry)
  })
{}

/**
 * @since 1.0.0
 * @category protocol
 */
export class Changes extends Schema.TaggedClass<Changes>("@effect/experimental/EventLogRemote/Changes")("Changes", {
  subscriptionId: Schema.Number,
  entries: Schema.Array(EncryptedRemoteEntry)
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export class StopChanges
  extends Schema.TaggedClass<StopChanges>("@effect/experimental/EventLogRemote/StopChanges")("StopChanges", {
    subscriptionId: Schema.Number
  })
{}

/**
 * @since 1.0.0
 * @category protocol
 */
export class Ping extends Schema.TaggedClass<Ping>("@effect/experimental/EventLogRemote/Ping")("Ping", {
  id: Schema.Number
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export class Pong extends Schema.TaggedClass<Pong>("@effect/experimental/EventLogRemote/Pong")("Pong", {
  id: Schema.Number
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export const ProtocolRequest = Schema.Union(
  WriteEntries,
  RemoveEntries,
  RequestChanges,
  StopChanges,
  Ping
)

/**
 * @since 1.0.0
 * @category protocol
 */
export const ProtocolRequestMsgPack = MsgPack.schema(ProtocolRequest)

/**
 * @since 1.0.0
 * @category protocol
 */
export const decodeRequest = Schema.decodeSync(ProtocolRequestMsgPack)

/**
 * @since 1.0.0
 * @category protocol
 */
export const encodeRequest = Schema.encodeSync(ProtocolRequestMsgPack)

/**
 * @since 1.0.0
 * @category protocol
 */
export const ProtocolResponse = Schema.Union(
  Hello,
  Ack,
  Changes,
  Pong
)

/**
 * @since 1.0.0
 * @category protocol
 */
export const ProtocolResponseMsgPack = MsgPack.schema(ProtocolResponse)

/**
 * @since 1.0.0
 * @category protocol
 */
export const decodeResponse = Schema.decodeSync(ProtocolResponseMsgPack)

/**
 * @since 1.0.0
 * @category protocol
 */
export const encodeResponse = Schema.encodeSync(ProtocolResponseMsgPack)

/**
 * @since 1.0.0
 * @category change
 */
export class RemoteAdditions
  extends Schema.TaggedClass<RemoteAdditions>("@effect/experimental/EventLogRemote/RemoveAdditions")(
    "RemoveAdditions",
    { entries: Schema.Array(RemoteEntry) }
  )
{}

/**
 * @since 1.0.0
 * @category encrytion
 */
export class Encryption extends Context.Tag("@effect/experimental/EventLogRemote/Encryption")<
  Encryption,
  {
    readonly encrypt: (
      identity: typeof Identity.Service,
      entries: ReadonlyArray<Entry>,
      id: number
    ) => Effect.Effect<WriteEntries>
    readonly decrypt: (
      identity: typeof Identity.Service,
      data: Changes
    ) => Effect.Effect<Array<RemoteEntry>>
    readonly sha256String: (data: Uint8Array) => Effect.Effect<string>
    readonly sha256: (data: Uint8Array) => Effect.Effect<Uint8Array>
  }
>() {}

/**
 * @since 1.0.0
 * @category encrytion
 */
export const makeEncryptionSubtle = (crypto: Crypto): Effect.Effect<typeof Encryption.Service> =>
  Effect.sync(() => {
    let idCounter = 0
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

    return Encryption.of({
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
          return new WriteEntries({
            publicKey: identity.publicKey,
            id: idCounter++,
            iv,
            encryptedEntries: encryptedEntries.map((entry, i) =>
              EncryptedEntry.make({
                entryId: entries[i].id,
                encryptedEntry: new Uint8Array(entry)
              })
            )
          }, { disableValidation: true })
        }),
      decrypt: (identity, { entries }) =>
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
export const layerEncryptionSubtle: Layer.Layer<Encryption> = Layer.suspend(() =>
  Layer.effect(Encryption, makeEncryptionSubtle(globalThis.crypto))
)

/**
 * @since 1.0.0
 * @category construtors
 */
export const fromSocket: Effect.Effect<
  void,
  never,
  Scope | EventLog | Encryption | Socket.Socket
> = Effect.gen(function*() {
  const log = yield* EventLog
  const socket = yield* Socket.Socket
  const encryption = yield* Encryption
  const writeRaw = yield* socket.writer

  const write = (request: typeof ProtocolRequest.Type) => Effect.suspend(() => writeRaw(encodeRequest(request)))

  yield* Effect.gen(function*() {
    let pendingCounter = 0
    const pending = new Map<number, Deferred.Deferred<void>>()

    let subscriptionIdCounter = 0
    const subscriptions = yield* RcMap.make({
      lookup: (_subscriptionId: number) =>
        Effect.acquireRelease(
          Mailbox.make<RemoteEntry>(),
          (mailbox) => mailbox.shutdown
        )
    })
    const identities = new WeakMap<any, typeof Identity.Service>()
    const badPing = yield* Deferred.make<never, Error>()

    let latestPing = 0
    let latestPong = 0

    yield* Effect.suspend(() => {
      if (latestPing !== latestPong) {
        return Deferred.fail(badPing, new Error("Ping timeout"))
      }
      return write(new Ping({ id: ++latestPing }))
    }).pipe(
      Effect.delay(10000),
      Effect.forever,
      Effect.fork,
      Effect.interruptible
    )

    return yield* socket.run((data) => {
      const res = decodeResponse(data)
      switch (res._tag) {
        case "Hello": {
          return log.registerRemote({
            id: res.remoteId,
            write: (identity, entries) =>
              Effect.gen(function*() {
                const encrypted = yield* encryption.encrypt(identity, entries, pendingCounter++)
                const deferred = yield* Deferred.make<void>()
                pending.set(encrypted.id, deferred)
                yield* write(new WriteEntries(encrypted))
                yield* Deferred.await(deferred)
              }),
            remove: (identity, ids) =>
              Effect.gen(function*() {
                const deferred = yield* Deferred.make<void>()
                const id = pendingCounter++
                pending.set(id, deferred)
                yield* write(
                  new RemoveEntries({
                    publicKey: identity.publicKey,
                    id,
                    entryIds: Arr.fromIterable(ids)
                  })
                )
                yield* Deferred.await(deferred)
              }),
            changes: (identity, startSequence) =>
              Effect.gen(function*() {
                const id = subscriptionIdCounter++
                const mailbox = yield* RcMap.get(subscriptions, id)
                identities.set(mailbox, identity)
                yield* Effect.acquireRelease(
                  write(
                    new RequestChanges({
                      publicKey: identity.publicKey,
                      subscriptionId: id,
                      startSequence
                    })
                  ),
                  () => write(new StopChanges({ subscriptionId: id }))
                )
                return mailbox
              })
          })
        }
        case "Ack": {
          const deferred = pending.get(res.id)
          if (deferred) {
            pending.delete(res.id)
            return Deferred.unsafeDone(deferred, Exit.void)
          }
          return
        }
        case "Pong": {
          latestPong = res.id
          if (res.id === latestPing) {
            return
          }
          return Effect.fail(new Error("Pong id mismatch"))
        }
        case "Changes": {
          return Effect.gen(function*() {
            const mailbox = yield* RcMap.get(subscriptions, res.subscriptionId)
            const identity = identities.get(mailbox)!
            const entries = yield* encryption.decrypt(identity, res)
            yield* mailbox.offerAll(entries)
          }).pipe(Effect.scoped)
        }
      }
    }).pipe(Effect.raceFirst(Deferred.await(badPing)))
  }).pipe(
    Effect.scoped,
    Effect.tapErrorCause(Effect.logDebug),
    Effect.retry({
      schedule: Schedule.exponential(100).pipe(
        Schedule.union(Schedule.spaced(5000))
      )
    }),
    Effect.annotateLogs({
      service: "EventLogRemote",
      method: "fromSocket"
    }),
    Effect.forkScoped,
    Effect.interruptible
  )
})

/**
 * @since 1.0.0
 * @category construtors
 */
export const fromWebSocket = (
  url: string
): Effect.Effect<void, never, Scope | Encryption | EventLog | Socket.WebSocketConstructor> =>
  Effect.gen(function*() {
    const socket = yield* Socket.makeWebSocket(url)
    return yield* fromSocket.pipe(
      Effect.provideService(Socket.Socket, socket)
    )
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (
  url: string
): Layer.Layer<
  never,
  never,
  | Socket.WebSocketConstructor
  | EventLog
  | Encryption
> => Layer.scopedDiscard(fromWebSocket(url))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketBrowser = (
  url: string
): Layer.Layer<never, never, EventLog> =>
  layerWebSocket(url).pipe(
    Layer.provide([layerEncryptionSubtle, Socket.layerWebSocketConstructorGlobal])
  )
