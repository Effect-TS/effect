/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import type * as AsyncProducer from "effect/SingleProducerAsyncInput"
import WebSocket from "isomorphic-ws"

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
export const Socket: Context.Tag<Socket, Socket> = Context.Tag<Socket>(
  "@effect/experimental/Socket"
)

/**
 * @since 1.0.0
 * @category models
 */
export interface Socket {
  readonly [SocketTypeId]: SocketTypeId
  readonly writer: Effect.Effect<Scope.Scope, never, (chunk: Uint8Array) => Effect.Effect<never, SocketError, void>>
  readonly pull: Effect.Effect<never, Option.Option<SocketError>, Uint8Array>
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketError extends Data.TaggedError("SocketError")<{
  readonly reason: "Write" | "Read" | "Open" | "Close"
  readonly error: unknown
}> {
  toString(): string {
    return `SocketError: ${this.reason} - ${this.error}`
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannel = <IE = never>() =>
(
  self: Socket
): Channel.Channel<never, IE, Chunk.Chunk<Uint8Array>, unknown, SocketError | IE, Chunk.Chunk<Uint8Array>, void> =>
  Channel.unwrap(
    Effect.gen(function*(_) {
      const writeScope = yield* _(Scope.make())
      const write = yield* _(Scope.extend(self.writer, writeScope))
      let inputError: Cause.Cause<IE | SocketError> | undefined

      const input: AsyncProducer.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array>, unknown> = {
        awaitRead: () => Effect.unit,
        emit(chunk) {
          return Effect.catchAllCause(Effect.forEach(chunk, write, { discard: true }), (cause) => {
            inputError = cause
            return Effect.unit
          })
        },
        error(error) {
          inputError = error
          return Scope.close(writeScope, Exit.unit)
        },
        done() {
          return Scope.close(writeScope, Exit.unit)
        }
      }

      const loop: Channel.Channel<
        never,
        unknown,
        unknown,
        unknown,
        Option.Option<SocketError>,
        Chunk.Chunk<Uint8Array>,
        void
      > = Channel.flatMap(
        self.pull,
        (chunk) => Channel.zipRight(Channel.write(Chunk.of(chunk)), loop)
      )

      const pull = Channel.catchAll(
        loop,
        Option.match({
          onNone: () => inputError ? Channel.failCause(inputError) : Channel.unit,
          onSome: (error: SocketError | IE) => Channel.fail(error)
        })
      )

      return Channel.embedInput(pull, input)
    })
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel = <IE = never>(): Channel.Channel<
  Socket,
  IE,
  Chunk.Chunk<Uint8Array>,
  unknown,
  SocketError | IE,
  Chunk.Chunk<Uint8Array>,
  void
> => Channel.unwrap(Effect.map(Socket, toChannel<IE>()))

const EOF = Symbol.for("@effect/experimental/Socket/EOF")

/**
 * @since 1.0.0
 */
export const defaultCloseCodeIsError = (code: number) => code !== 1000

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url: string, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
}): Effect.Effect<Scope.Scope, SocketError, Socket> =>
  Effect.gen(function*(_) {
    const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError
    const queue = yield* _(Effect.acquireRelease(
      Queue.unbounded<Uint8Array | typeof EOF>(),
      Queue.shutdown
    ))
    let error: SocketError | undefined
    const ws = yield* _(Effect.acquireRelease(
      Effect.async<never, SocketError, globalThis.WebSocket>((resume) => {
        const WS = "WebSocket" in globalThis ? globalThis.WebSocket : WebSocket
        const ws = new WS(url) as globalThis.WebSocket
        const encoder = new TextEncoder()
        let connected = false
        ws.onopen = () => {
          connected = true
          resume(Effect.succeed(ws))
        }
        ws.onmessage = (event) => {
          Queue.unsafeOffer(
            queue,
            event.data instanceof Uint8Array
              ? event.data
              : typeof event.data === "string"
              ? encoder.encode(event.data)
              : new Uint8Array(event.data)
          )
        }
        ws.onclose = (event) => {
          if (closeCodeIsError(event.code)) {
            error = new SocketError({ reason: "Close", error: event })
          }
          Queue.unsafeOffer(queue, EOF)
        }
        ws.onerror = (error_) => {
          console.log("error", error_)
          error = new SocketError({ reason: "Open", error: (error_ as any).message })
          Queue.unsafeOffer(queue, EOF)
          if (connected === false) {
            resume(Effect.fail(error))
          }
        }
        return Effect.sync(() => {
          ws.close()
        })
      }),
      (ws) =>
        Effect.sync(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close()
          }
        })
    ))

    const write = (chunk: Uint8Array) =>
      Effect.try({
        try: () => ws.send(chunk),
        catch: (error) => new SocketError({ reason: "Write", error })
      })
    const writer = Effect.succeed(write)

    const pull = Effect.flatMap(
      Queue.take(queue),
      (item) => {
        if (item === EOF) {
          return error ? Effect.fail(Option.some(error)) : Effect.fail(Option.none())
        }
        return Effect.succeed(item as Uint8Array)
      }
    )

    return Socket.of({
      [SocketTypeId]: SocketTypeId,
      writer,
      pull
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
): Channel.Channel<
  never,
  IE,
  Chunk.Chunk<Uint8Array>,
  unknown,
  SocketError | IE,
  Chunk.Chunk<Uint8Array>,
  void
> =>
  Channel.unwrapScoped(
    Effect.map(makeWebSocket(url, options), toChannel<IE>())
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url: string, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
}): Layer.Layer<never, SocketError, Socket> => Layer.scoped(Socket, makeWebSocket(url, options))
