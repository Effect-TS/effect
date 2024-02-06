/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import type * as AsyncProducer from "effect/SingleProducerAsyncInput"
import IsoWebSocket from "isomorphic-ws"

/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketTypeId = Symbol.for("@effect/experimental/Socket")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketTypeId = typeof SocketTypeId

/**
 * @since 1.0.0
 * @category tags
 */
export const Socket: Context.Tag<Socket, Socket> = Context.GenericTag<Socket>(
  "@effect/experimental/Socket"
)

/**
 * @since 1.0.0
 * @category models
 */
export interface Socket {
  readonly [SocketTypeId]: SocketTypeId
  readonly run: <R, E, _>(
    handler: (_: Uint8Array) => Effect.Effect<_, E, R>
  ) => Effect.Effect<void, SocketError, R>
  readonly writer: Effect.Effect<(chunk: Uint8Array) => Effect.Effect<void>, never, Scope.Scope>
  // readonly messages: Queue.Dequeue<Uint8Array>
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketError extends Data.TaggedError("SocketError")<{
  readonly reason: "Write" | "Read" | "Open" | "Close"
  readonly error: unknown
}> {
  /**
   * @since 1.0.0
   */
  toString(): string {
    return `SocketError: ${this.reason} - ${this.error}`
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannel = <IE>(
  self: Socket
): Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, SocketError | IE, IE, void, unknown> =>
  Channel.unwrap(
    Effect.gen(function*(_) {
      const writeScope = yield* _(Scope.make())
      const write = yield* _(Scope.extend(self.writer, writeScope))
      const exitQueue = yield* _(Queue.unbounded<Exit.Exit<Chunk.Chunk<Uint8Array>, SocketError | IE>>())

      const input: AsyncProducer.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array>, unknown> = {
        awaitRead: () => Effect.unit,
        emit(chunk) {
          return Effect.catchAllCause(
            Effect.forEach(chunk, write, { discard: true }),
            (cause) => Queue.offer(exitQueue, Exit.failCause(cause))
          )
        },
        error(error) {
          return Effect.zipRight(
            Scope.close(writeScope, Exit.unit),
            Queue.offer(exitQueue, Exit.failCause(error))
          )
        },
        done() {
          return Scope.close(writeScope, Exit.unit)
        }
      }

      yield* _(
        self.run((data) => Queue.offer(exitQueue, Exit.succeed(Chunk.of(data)))),
        Effect.zipRight(Effect.failCause(Cause.empty)),
        Effect.exit,
        Effect.tap((exit) => Queue.offer(exitQueue, exit)),
        Effect.fork
      )

      const loop: Channel.Channel<Chunk.Chunk<Uint8Array>, unknown, SocketError | IE, unknown, void, unknown> = Channel
        .flatMap(
          Queue.take(exitQueue),
          Exit.match({
            onFailure: (cause) => Cause.isEmptyType(cause) ? Channel.unit : Channel.failCause(cause),
            onSuccess: (chunk) => Channel.zipRight(Channel.write(chunk), loop)
          })
        )

      return Channel.embedInput(loop, input)
    })
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannelWith = <IE = never>() =>
(
  self: Socket
): Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, SocketError | IE, IE, void, unknown> =>
  toChannel(self)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel = <IE = never>(): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array>,
  SocketError | IE,
  IE,
  void,
  unknown,
  Socket
> => Channel.unwrap(Effect.map(Socket, toChannelWith<IE>()))

/**
 * @since 1.0.0
 */
export const defaultCloseCodeIsError = (code: number) => code !== 1000

/**
 * @since 1.0.0
 * @category tags
 */
export interface WebSocket {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const WebSocket: Context.Tag<WebSocket, globalThis.WebSocket> = Context.GenericTag(
  "@effect/experimental/Socket/WebSocket"
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url: string | Effect.Effect<string>, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
}): Effect.Effect<Socket> =>
  fromWebSocket(
    Effect.acquireRelease(
      Effect.map(
        typeof url === "string" ? Effect.succeed(url) : url,
        (url) => {
          const WS = "WebSocket" in globalThis ? globalThis.WebSocket : IsoWebSocket
          return new WS(url) as globalThis.WebSocket
        }
      ),
      (ws) => Effect.sync(() => ws.close())
    ),
    options
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWebSocket = (
  acquire: Effect.Effect<globalThis.WebSocket, SocketError, Scope.Scope>,
  options?: {
    readonly closeCodeIsError?: (code: number) => boolean
  }
): Effect.Effect<Socket> =>
  Effect.gen(function*(_) {
    const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError
    const sendQueue = yield* _(Queue.unbounded<Uint8Array>())

    const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*(_) {
        const ws = yield* _(acquire)
        const encoder = new TextEncoder()
        const runtime = yield* _(Effect.runtime<R>(), Effect.provideService(WebSocket, ws))
        const run = Runtime.runFork(runtime)

        ws.onmessage = (event) => {
          run(
            Effect.catchAllCause(
              handler(
                event.data instanceof Uint8Array
                  ? event.data
                  : typeof event.data === "string"
                  ? encoder.encode(event.data)
                  : new Uint8Array(event.data)
              ),
              (cause) => Effect.log(cause, "Unhandled error in WebSocket")
            )
          )
        }

        if (ws.readyState !== IsoWebSocket.OPEN) {
          yield* _(Effect.async<void, SocketError, never>((resume) => {
            ws.onopen = () => {
              resume(Effect.unit)
            }
            ws.onerror = (error_) => {
              resume(Effect.fail(new SocketError({ reason: "Open", error: (error_ as any).message })))
            }
          }))
        }

        yield* _(
          Queue.take(sendQueue),
          Effect.tap((chunk) =>
            Effect.try({
              try: () => ws.send(chunk),
              catch: (error) => Effect.fail(new SocketError({ reason: "Write", error: (error as any).message }))
            })
          ),
          Effect.forever,
          Effect.fork
        )

        yield* _(
          Effect.async<void, SocketError, never>((resume) => {
            ws.onclose = (event) => {
              if (closeCodeIsError(event.code)) {
                resume(Effect.fail(new SocketError({ reason: "Close", error: event })))
              } else {
                resume(Effect.unit)
              }
            }
            ws.onerror = (error) => {
              resume(Effect.fail(new SocketError({ reason: "Read", error: (error as any).message })))
            }
          })
        )
      }).pipe(Effect.scoped)

    const write = (chunk: Uint8Array) => Queue.offer(sendQueue, chunk)
    const writer = Effect.succeed(write)

    return Socket.of({
      [SocketTypeId]: SocketTypeId,
      run,
      writer
    })
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocketChannel = <IE = never>(
  url: string,
  options?: {
    readonly closeCodeIsError?: (code: number) => boolean
  }
): Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, SocketError | IE, IE, void, unknown> =>
  Channel.unwrapScoped(
    Effect.map(makeWebSocket(url, options), toChannelWith<IE>())
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url: string, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
}): Layer.Layer<Socket> => Layer.scoped(Socket, makeWebSocket(url, options))
