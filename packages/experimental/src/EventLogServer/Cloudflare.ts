/**
 * @since 1.0.0
 */
/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import { RemoteId } from "../EventJournal.js"
import type { EncryptedRemoteEntry } from "../EventLogEncryption.js"
import * as EventLogRemote from "../EventLogRemote.js"
import * as EventLogServer from "../EventLogServer.js"

/**
 * @since 1.0.0
 * @category DurableObject
 */
export abstract class EventLogDurableObject extends DurableObject {
  /**
   * @since 1.0.0
   */
  readonly runtime: ManagedRuntime.ManagedRuntime<EventLogServer.Storage, never>

  constructor(options: {
    readonly ctx: DurableObjectState
    readonly env: unknown
    readonly storageLayer: Layer.Layer<EventLogServer.Storage>
  }) {
    super(options.ctx, options.env)
    this.ctx.setHibernatableWebSocketEventTimeout(5000)
    this.runtime = ManagedRuntime.make(options.storageLayer)
  }

  /**
   * @since 1.0.0
   */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    return this.handleRequest(
      ws,
      EventLogRemote.decodeRequest(
        message instanceof ArrayBuffer
          ? new Uint8Array(message)
          : new TextEncoder().encode(message)
      )
    )
  }

  private chunks = new Map<
    number,
    {
      readonly parts: Array<Uint8Array>
      count: number
      bytes: number
    }
  >()
  /**
   * @since 1.0.0
   */
  private async handleRequest(
    ws: WebSocket,
    request: typeof EventLogRemote.ProtocolRequest.Type
  ): Promise<void> {
    switch (request._tag) {
      case "WriteEntries": {
        return Effect.gen(this, function*() {
          const storage = yield* EventLogServer.Storage
          const entries = request.encryptedEntries.map(
            ({ encryptedEntry, entryId }) =>
              new EventLogServer.PersistedEntry({
                entryId,
                iv: request.iv,
                encryptedEntry
              })
          )
          const encryptedEntries = yield* storage.write(
            request.publicKey,
            entries
          )
          ws.send(
            EventLogRemote.encodeResponse(
              new EventLogRemote.Ack({
                id: request.id,
                sequenceNumbers: encryptedEntries.map((_) => _.sequence)
              })
            )
          )
          const changes = this.encodeChanges(
            request.publicKey,
            encryptedEntries
          )
          for (const peer of this.ctx.getWebSockets()) {
            if (peer === ws) continue
            for (const change of changes) {
              peer.send(change)
            }
          }
        }).pipe(this.runtime.runPromise)
      }
      case "ChunkedMessage": {
        const data = EventLogRemote.ChunkedMessage.join(this.chunks, request)
        if (!data) return
        return this.handleRequest(ws, EventLogRemote.decodeRequest(data))
      }
      case "RequestChanges": {
        return Effect.gen(this, function*() {
          const storage = yield* EventLogServer.Storage
          const entries = yield* storage.entries(
            request.publicKey,
            request.startSequence
          )
          if (entries.length === 0) return
          const changes = this.encodeChanges(request.publicKey, entries)
          for (const change of changes) {
            ws.send(change)
          }
        }).pipe(this.runtime.runPromise)
      }
    }
  }

  /**
   * @since 1.0.0
   */
  private encodeChanges(
    publicKey: string,
    entries: ReadonlyArray<EncryptedRemoteEntry>
  ): ReadonlyArray<Uint8Array> {
    let changes = [
      EventLogRemote.encodeResponse(
        new EventLogRemote.Changes({
          publicKey,
          entries
        })
      )
    ]
    if (changes[0].byteLength > 512_000) {
      changes = EventLogRemote.ChunkedMessage.split(
        Math.floor(Math.random() * 1_000_000_000),
        changes[0]
      ).map((_) => EventLogRemote.encodeResponse(_))
    }
    return changes
  }

  /**
   * @since 1.0.0
   */
  webSocketError(_ws: WebSocket, error: Error): void {
    this.runtime.runFork(Effect.logWarning(Cause.fail(error)))
  }

  /**
   * @since 1.0.0
   */
  webSocketClose(_ws: WebSocket, code: number, reason: string): void {
    this.runtime.runFork(Effect.logWarning("WebSocket closed", { code, reason }))
  }

  /**
   * @since 1.0.0
   */
  async fetch(): Promise<Response> {
    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    this.ctx.acceptWebSocket(server)

    EventLogServer.Storage.pipe(
      Effect.flatMap((_) => _.getId),
      Effect.tap((remoteId) => {
        server.send(
          EventLogRemote.encodeResponse(
            new EventLogRemote.Hello({
              remoteId: RemoteId.make(remoteId)
            })
          )
        )
      }),
      this.runtime.runFork
    )

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }
}
