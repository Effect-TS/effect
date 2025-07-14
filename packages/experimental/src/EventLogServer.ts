/**
 * @since 1.0.0
 */
import type * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as MsgPack from "@effect/platform/MsgPack"
import type * as Socket from "@effect/platform/Socket"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberMap from "effect/FiberMap"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as PubSub from "effect/PubSub"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Uuid from "uuid"
import type { RemoteId } from "./EventJournal.js"
import { EntryId, makeRemoteId } from "./EventJournal.js"
import { EncryptedRemoteEntry } from "./EventLogEncryption.js"
import type { ProtocolRequest, ProtocolResponse } from "./EventLogRemote.js"
import { Ack, Changes, ChunkedMessage, decodeRequest, encodeResponse, Hello, Pong } from "./EventLogRemote.js"

const constChunkSize = 512_000

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeHandler: Effect.Effect<
  (socket: Socket.Socket) => Effect.Effect<void, Socket.SocketError, Scope.Scope>,
  never,
  Storage
> = Effect.gen(function*() {
  const storage = yield* Storage
  const remoteId = yield* storage.getId
  let chunkId = 0

  function* handler(socket: Socket.Socket) {
    const subscriptions = yield* FiberMap.make<string>()
    const writeRaw = yield* socket.writer
    const chunks = new Map<number, {
      readonly parts: Array<Uint8Array>
      count: number
      bytes: number
    }>()
    let latestSequence = -1

    function* writeGen(response: typeof ProtocolResponse.Type) {
      const data = encodeResponse(response)
      if (response._tag !== "Changes" || data.byteLength <= constChunkSize) {
        return yield* writeRaw(data)
      }
      const id = chunkId++
      for (const part of ChunkedMessage.split(id, data)) {
        yield* writeRaw(encodeResponse(part))
      }
    }
    const write = (response: typeof ProtocolResponse.Type) => Effect.gen(() => writeGen(response))

    yield* Effect.fork(write(new Hello({ remoteId })))

    function handleRequest(request: typeof ProtocolRequest.Type) {
      switch (request._tag) {
        case "Ping": {
          return write(new Pong({ id: request.id }))
        }
        case "WriteEntries": {
          if (request.encryptedEntries.length === 0) {
            return write(
              new Ack({
                id: request.id,
                sequenceNumbers: []
              })
            )
          }
          return Effect.gen(function*() {
            const entries = request.encryptedEntries.map(({ encryptedEntry, entryId }) =>
              new PersistedEntry({
                entryId,
                iv: request.iv,
                encryptedEntry
              })
            )
            const encrypted = yield* storage.write(request.publicKey, entries)
            latestSequence = encrypted[encrypted.length - 1].sequence
            return yield* write(
              new Ack({
                id: request.id,
                sequenceNumbers: encrypted.map((e) => e.sequence)
              })
            )
          })
        }
        case "RequestChanges": {
          return Effect.gen(function*() {
            const changes = yield* storage.changes(request.publicKey, request.startSequence)
            return yield* changes.takeAll.pipe(
              Effect.flatMap(function([entries]) {
                const latestEntries: Array<EncryptedRemoteEntry> = []
                for (const entry of entries) {
                  if (entry.sequence <= latestSequence) continue
                  latestEntries.push(entry)
                  latestSequence = entry.sequence
                }
                if (latestEntries.length === 0) return Effect.void
                return write(
                  new Changes({
                    publicKey: request.publicKey,
                    entries: Chunk.toReadonlyArray(entries)
                  })
                )
              }),
              Effect.forever
            )
          }).pipe(
            Effect.scoped,
            FiberMap.run(subscriptions, request.publicKey)
          )
        }
        case "StopChanges": {
          return FiberMap.remove(subscriptions, request.publicKey)
        }
        case "ChunkedMessage": {
          const data = ChunkedMessage.join(chunks, request)
          if (!data) return
          return handleRequest(decodeRequest(data))
        }
      }
    }

    yield* socket.run((data) => handleRequest(decodeRequest(data))).pipe(Effect.catchAllCause(Effect.logDebug))
  }

  return (socket) =>
    Effect.gen(() => handler(socket)).pipe(Effect.annotateLogs({
      module: "EventLogServer"
    }))
})

/**
 * @since 1.0.0
 * @category websockets
 */
export const makeHandlerHttp: Effect.Effect<
  Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    HttpServerError.RequestError | Socket.SocketError,
    HttpServerRequest.HttpServerRequest | Scope.Scope
  >,
  never,
  Storage
> = Effect.gen(function*() {
  const handler = yield* makeHandler

  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const socket = yield* request.upgrade
    yield* handler(socket)
    return HttpServerResponse.empty()
  }).pipe(Effect.annotateLogs({
    module: "EventLogServer"
  }))
})

/**
 * @since 1.0.0
 * @category storage
 */
export class PersistedEntry extends Schema.Class<PersistedEntry>("@effect/experimental/EventLogServer/PersistedEntry")({
  entryId: EntryId,
  iv: Schema.Uint8ArrayFromSelf,
  encryptedEntry: Schema.Uint8ArrayFromSelf
}) {
  /**
   * @since 1.0.0
   */
  static fromMsgPack = MsgPack.schema(PersistedEntry)

  /**
   * @since 1.0.0
   */
  static encode = Schema.encodeSync(this.fromMsgPack)

  /**
   * @since 1.0.0
   */
  get entryIdString(): string {
    return Uuid.stringify(this.entryId)
  }
}

/**
 * @since 1.0.0
 * @category storage
 */
export class Storage extends Context.Tag("@effect/experimental/EventLogServer/Storage")<
  Storage,
  {
    readonly getId: Effect.Effect<RemoteId>
    readonly write: (
      publicKey: string,
      entries: ReadonlyArray<PersistedEntry>
    ) => Effect.Effect<ReadonlyArray<EncryptedRemoteEntry>>
    readonly entries: (
      publicKey: string,
      startSequence: number
    ) => Effect.Effect<ReadonlyArray<EncryptedRemoteEntry>>
    readonly changes: (
      publicKey: string,
      startSequence: number
    ) => Effect.Effect<Mailbox.ReadonlyMailbox<EncryptedRemoteEntry>, never, Scope.Scope>
  }
>() {}

/**
 * @since 1.0.0
 * @category storage
 */
export const makeStorageMemory: Effect.Effect<typeof Storage.Service, never, Scope.Scope> = Effect.gen(function*() {
  const knownIds = new Map<string, number>()
  const journals = new Map<string, Array<EncryptedRemoteEntry>>()
  const remoteId = makeRemoteId()
  const ensureJournal = (publicKey: string) => {
    let journal = journals.get(publicKey)
    if (journal) return journal
    journal = []
    journals.set(publicKey, journal)
    return journal
  }
  const pubsubs = yield* RcMap.make({
    lookup: (_publicKey: string) =>
      Effect.acquireRelease(
        PubSub.unbounded<EncryptedRemoteEntry>(),
        PubSub.shutdown
      ),
    idleTimeToLive: 60000
  })

  return Storage.of({
    getId: Effect.succeed(remoteId),
    write: (publicKey, entries) =>
      Effect.gen(function*() {
        const active = yield* RcMap.keys(pubsubs)
        const pubsub = active.includes(publicKey) ? yield* RcMap.get(pubsubs, publicKey) : undefined
        const journal = ensureJournal(publicKey)
        const encryptedEntries: Array<EncryptedRemoteEntry> = []
        for (const entry of entries) {
          const idString = entry.entryIdString
          if (knownIds.has(idString)) continue
          const encrypted = EncryptedRemoteEntry.make({
            sequence: journal.length,
            entryId: entry.entryId,
            iv: entry.iv,
            encryptedEntry: entry.encryptedEntry
          })
          encryptedEntries.push(encrypted)
          knownIds.set(idString, encrypted.sequence)
          journal.push(encrypted)
          pubsub?.unsafeOffer(encrypted)
        }
        return encryptedEntries
      }).pipe(Effect.scoped),
    entries: (publicKey, startSequence) => Effect.sync(() => ensureJournal(publicKey).slice(startSequence)),
    changes: (publicKey, startSequence) =>
      Effect.gen(function*() {
        const mailbox = yield* Mailbox.make<EncryptedRemoteEntry>()
        const pubsub = yield* RcMap.get(pubsubs, publicKey)
        const queue = yield* pubsub.subscribe
        yield* mailbox.offerAll(ensureJournal(publicKey).slice(startSequence))
        yield* queue.takeBetween(1, Number.MAX_SAFE_INTEGER).pipe(
          Effect.tap((chunk) => mailbox.offerAll(chunk)),
          Effect.forever,
          Effect.forkScoped,
          Effect.interruptible
        )
        return mailbox
      })
  })
})

/**
 * @since 1.0.0
 * @category storage
 */
export const layerStorageMemory: Layer.Layer<Storage> = Layer.scoped(Storage, makeStorageMemory)
