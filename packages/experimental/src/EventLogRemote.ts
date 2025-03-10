/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack"
import * as Socket from "@effect/platform/Socket"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as RcMap from "effect/RcMap"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type { Entry } from "./EventJournal.js"
import { RemoteEntry, RemoteId } from "./EventJournal.js"
import type { Identity } from "./EventLog.js"
import { EventLog } from "./EventLog.js"
import { EncryptedEntry, EncryptedRemoteEntry, EventLogEncryption, layerSubtle } from "./EventLogEncryption.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface EventLogRemote {
  readonly id: RemoteId
  readonly changes: (
    identity: typeof Identity.Service,
    startSequence: number
  ) => Effect.Effect<Mailbox.ReadonlyMailbox<RemoteEntry>, never, Scope.Scope>
  readonly write: (identity: typeof Identity.Service, entries: ReadonlyArray<Entry>) => Effect.Effect<void>
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
export class ChunkedMessage
  extends Schema.TaggedClass<ChunkedMessage>("@effect/experimental/EventLogRemote/ChunkedMessage")("ChunkedMessage", {
    id: Schema.Number,
    part: Schema.Tuple(Schema.Number, Schema.Number),
    data: Schema.Uint8ArrayFromSelf
  })
{
  /**
   * @since 1.0.0
   */
  static split(id: number, data: Uint8Array): ReadonlyArray<ChunkedMessage> {
    const parts = Math.ceil(data.byteLength / constChunkSize)
    const result: Array<ChunkedMessage> = new Array(parts)
    for (let i = 0; i < parts; i++) {
      const start = i * constChunkSize
      const end = Math.min((i + 1) * constChunkSize, data.byteLength)
      result[i] = new ChunkedMessage({ id, part: [i, parts], data: data.subarray(start, end) })
    }
    return result
  }

  /**
   * @since 1.0.0
   */
  static join(
    map: Map<number, {
      readonly parts: Array<Uint8Array>
      count: number
      bytes: number
    }>,
    part: ChunkedMessage
  ): Uint8Array | undefined {
    const [index, total] = part.part
    let entry = map.get(part.id)
    if (!entry) {
      entry = {
        parts: new Array(total),
        count: 0,
        bytes: 0
      }
      map.set(part.id, entry)
    }
    entry.parts[index] = part.data
    entry.count++
    entry.bytes += part.data.byteLength
    if (entry.count !== total) {
      return
    }
    const data = new Uint8Array(entry.bytes)
    let offset = 0
    for (const part of entry.parts) {
      data.set(part, offset)
      offset += part.byteLength
    }
    map.delete(part.id)
    return data
  }
}

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
export class Ack extends Schema.TaggedClass<Ack>("@effect/experimental/EventLogRemote/Ack")("Ack", {
  id: Schema.Number,
  sequenceNumbers: Schema.Array(Schema.Number)
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export class RequestChanges
  extends Schema.TaggedClass<RequestChanges>("@effect/experimental/EventLogRemote/RequestChanges")("RequestChanges", {
    publicKey: Schema.String,
    startSequence: Schema.Number
  })
{}

/**
 * @since 1.0.0
 * @category protocol
 */
export class Changes extends Schema.TaggedClass<Changes>("@effect/experimental/EventLogRemote/Changes")("Changes", {
  publicKey: Schema.String,
  entries: Schema.Array(EncryptedRemoteEntry)
}) {}

/**
 * @since 1.0.0
 * @category protocol
 */
export class StopChanges
  extends Schema.TaggedClass<StopChanges>("@effect/experimental/EventLogRemote/StopChanges")("StopChanges", {
    publicKey: Schema.String
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
  RequestChanges,
  StopChanges,
  ChunkedMessage,
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
  ChunkedMessage,
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

const constChunkSize = 512_000

/**
 * @since 1.0.0
 * @category construtors
 */
export const fromSocket = (options?: {
  readonly disablePing?: boolean
}): Effect.Effect<
  void,
  never,
  Scope.Scope | EventLog | EventLogEncryption | Socket.Socket
> =>
  Effect.gen(function*() {
    const log = yield* EventLog
    const socket = yield* Socket.Socket
    const encryption = yield* EventLogEncryption
    const scope = yield* Effect.scope
    const writeRaw = yield* socket.writer

    function* writeGen(request: typeof ProtocolRequest.Type) {
      const data = encodeRequest(request)
      if (request._tag !== "WriteEntries" || data.byteLength <= constChunkSize) {
        return yield* writeRaw(data)
      }
      const id = request.id
      for (const part of ChunkedMessage.split(id, data)) {
        yield* writeRaw(encodeRequest(part))
      }
    }

    const write = (request: typeof ProtocolRequest.Type) => Effect.gen(() => writeGen(request))

    yield* Effect.gen(function*() {
      let pendingCounter = 0
      const pending = new Map<number, {
        readonly entries: ReadonlyArray<Entry>
        readonly deferred: Deferred.Deferred<void>
        readonly publicKey: string
      }>()
      const chunks = new Map<number, {
        readonly parts: Array<Uint8Array>
        count: number
        bytes: number
      }>()

      const subscriptions = yield* RcMap.make({
        lookup: (publicKey: string) =>
          Effect.acquireRelease(
            Mailbox.make<RemoteEntry>(),
            (mailbox) =>
              Effect.zipRight(
                mailbox.shutdown,
                Effect.ignoreLogged(write(new StopChanges({ publicKey })))
              )
          )
      })
      const identities = new WeakMap<any, typeof Identity.Service>()
      const badPing = yield* Deferred.make<never, Error>()

      let latestPing = 0
      let latestPong = 0

      if (options?.disablePing !== true) {
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
      }

      function handleMessage(res: typeof ProtocolResponse.Type) {
        switch (res._tag) {
          case "Hello": {
            return log.registerRemote({
              id: res.remoteId,
              write: (identity, entries) =>
                Effect.gen(function*() {
                  const encrypted = yield* encryption.encrypt(identity, entries)
                  const deferred = yield* Deferred.make<void>()
                  const id = pendingCounter++
                  pending.set(id, {
                    entries,
                    deferred,
                    publicKey: identity.publicKey
                  })
                  yield* Effect.orDie(write(
                    new WriteEntries({
                      publicKey: identity.publicKey,
                      id,
                      iv: encrypted.iv,
                      encryptedEntries: encrypted.encryptedEntries.map((encryptedEntry, i) => ({
                        entryId: entries[i].id,
                        encryptedEntry
                      }))
                    })
                  ))
                  yield* Deferred.await(deferred)
                }),
              changes: (identity, startSequence) =>
                Effect.gen(function*() {
                  const mailbox = yield* RcMap.get(subscriptions, identity.publicKey)
                  identities.set(mailbox, identity)
                  yield* Effect.orDie(write(
                    new RequestChanges({
                      publicKey: identity.publicKey,
                      startSequence
                    })
                  ))
                  return mailbox
                })
            }).pipe(Scope.extend(scope))
          }
          case "Ack": {
            return Effect.gen(function*() {
              const entry = pending.get(res.id)
              if (!entry) return
              pending.delete(res.id)
              const { deferred, entries, publicKey } = entry
              const remoteEntries = res.sequenceNumbers.map((sequenceNumber, i) => {
                const entry = entries[i]
                return new RemoteEntry({
                  remoteSequence: sequenceNumber,
                  entry
                })
              })
              const mailbox = yield* RcMap.get(subscriptions, publicKey)
              yield* mailbox.offerAll(remoteEntries)
              yield* Deferred.done(deferred, Exit.void)
            })
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
              const mailbox = yield* RcMap.get(subscriptions, res.publicKey)
              const identity = identities.get(mailbox)!
              const entries = yield* encryption.decrypt(identity, res.entries)
              yield* mailbox.offerAll(entries)
            }).pipe(Effect.scoped)
          }
          case "ChunkedMessage": {
            const data = ChunkedMessage.join(chunks, res)
            if (!data) return
            return handleMessage(decodeResponse(data))
          }
        }
      }

      return yield* socket.run((data) => handleMessage(decodeResponse(data))).pipe(
        Effect.raceFirst(Deferred.await(badPing))
      )
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
  url: string,
  options?: {
    readonly disablePing?: boolean
  }
): Effect.Effect<void, never, Scope.Scope | EventLogEncryption | EventLog | Socket.WebSocketConstructor> =>
  Effect.gen(function*() {
    const socket = yield* Socket.makeWebSocket(url)
    return yield* fromSocket(options).pipe(
      Effect.provideService(Socket.Socket, socket)
    )
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (
  url: string,
  options?: {
    readonly disablePing?: boolean
  }
): Layer.Layer<
  never,
  never,
  | Socket.WebSocketConstructor
  | EventLog
  | EventLogEncryption
> => Layer.scopedDiscard(fromWebSocket(url, options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketBrowser = (
  url: string,
  options?: {
    readonly disablePing?: boolean
  }
): Layer.Layer<never, never, EventLog> =>
  layerWebSocket(url, options).pipe(
    Layer.provide([layerSubtle, Socket.layerWebSocketConstructorGlobal])
  )
