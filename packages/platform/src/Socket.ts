/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import type * as AsyncProducer from "effect/SingleProducerAsyncInput"
import IsoWebSocket from "isomorphic-ws"
import { RefailError, TypeIdError } from "./Error.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/platform/Socket")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category tags
 */
export const Socket: Context.Tag<Socket, Socket> = Context.GenericTag<Socket>(
  "@effect/platform/Socket"
)

/**
 * @since 1.0.0
 * @category models
 */
export interface Socket {
  readonly [TypeId]: TypeId
  readonly run: <R, E, _>(
    handler: (_: Uint8Array) => Effect.Effect<_, E, R>
  ) => Effect.Effect<void, SocketError | E, R>
  readonly writer: Effect.Effect<(chunk: Uint8Array | CloseEvent) => Effect.Effect<void>, never, Scope.Scope>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const CloseEventTypeId = Symbol.for("@effect/platform/Socket/CloseEvent")

/**
 * @since 1.0.0
 * @category type ids
 */
export type CloseEventTypeId = typeof CloseEventTypeId

/**
 * @since 1.0.0
 * @category models
 */
export class CloseEvent {
  /**
   * @since 1.0.0
   */
  readonly [CloseEventTypeId]: CloseEventTypeId
  constructor(readonly code = 1000, readonly reason?: string) {
    this[CloseEventTypeId] = CloseEventTypeId
  }
  /**
   * @since 1.0.0
   */
  toString() {
    return this.reason ? `${this.code}: ${this.reason}` : `${this.code}`
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCloseEvent = (u: unknown): u is CloseEvent => Predicate.hasProperty(u, CloseEventTypeId)

/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketErrorTypeId = Symbol.for("@effect/platform/Socket/SocketError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketErrorTypeId = typeof SocketErrorTypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSocketError = (u: unknown): u is SocketError => Predicate.hasProperty(u, SocketErrorTypeId)

/**
 * @since 1.0.0
 * @category errors
 */
export type SocketError = SocketGenericError | SocketCloseError

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketGenericError extends RefailError(SocketErrorTypeId, "SocketError")<{
  readonly reason: "Write" | "Read" | "Open" | "OpenTimeout"
}> {
  get message() {
    return `${this.reason}: ${super.message}`
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketCloseError extends TypeIdError(SocketErrorTypeId, "SocketError")<{
  readonly reason: "Close"
  readonly code: number
  readonly closeReason?: string
}> {
  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is SocketCloseError {
    return isSocketError(u) && u.reason === "Close"
  }

  /**
   * @since 1.0.0
   */
  static isClean(isClean: (code: number) => boolean) {
    return function(u: unknown): u is SocketCloseError {
      return SocketCloseError.is(u) && isClean(u.code)
    }
  }

  get message() {
    if (this.closeReason) {
      return `${this.reason}: ${this.code}: ${this.closeReason}`
    }
    return `${this.reason}: ${this.code}`
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannel = <IE>(
  self: Socket
): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown
> =>
  Channel.unwrap(
    Effect.gen(function*(_) {
      const writeScope = yield* _(Scope.make())
      const write = yield* _(Scope.extend(self.writer, writeScope))
      const exitQueue = yield* _(Queue.unbounded<Exit.Exit<Chunk.Chunk<Uint8Array>, SocketError | IE>>())

      const input: AsyncProducer.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array | CloseEvent>, unknown> = {
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
        Effect.fork,
        Effect.interruptible
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
): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown
> => toChannel(self)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel = <IE = never>(): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown,
  Socket
> => Channel.unwrap(Effect.map(Socket, toChannelWith<IE>()))

/**
 * @since 1.0.0
 */
export const defaultCloseCodeIsError = (code: number) => code !== 1000 && code !== 1006

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
  "@effect/platform/Socket/WebSocket"
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url: string | Effect.Effect<string>, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
  readonly openTimeout?: DurationInput
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
    readonly openTimeout?: DurationInput
  }
): Effect.Effect<Socket> =>
  Effect.gen(function*(_) {
    const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError
    const sendQueue = yield* _(Queue.unbounded<Uint8Array | CloseEvent>())

    const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*(_) {
        const ws = yield* _(acquire)
        const encoder = new TextEncoder()
        const fiberSet = yield* _(FiberSet.make<any, E | SocketError>())
        const run = yield* _(
          FiberSet.runtime(fiberSet)<R>(),
          Effect.provideService(WebSocket, ws)
        )
        let open = false

        ws.onmessage = (event) => {
          run(
            handler(
              event.data instanceof Uint8Array
                ? event.data
                : typeof event.data === "string"
                ? encoder.encode(event.data)
                : new Uint8Array(event.data)
            )
          )
        }
        ws.onclose = (event) => {
          Deferred.unsafeDone(
            fiberSet.deferred,
            Effect.fail(
              new SocketCloseError({
                reason: "Close",
                code: event.code,
                closeReason: event.reason
              })
            )
          )
        }
        ws.onerror = (error) => {
          Deferred.unsafeDone(
            fiberSet.deferred,
            Effect.fail(new SocketGenericError({ reason: open ? "Read" : "Open", error: (error as any).message }))
          )
        }

        if (ws.readyState !== IsoWebSocket.OPEN) {
          yield* _(
            Effect.async<void, SocketError, never>((resume) => {
              ws.onopen = () => {
                resume(Effect.unit)
              }
            }),
            Effect.timeoutFail({
              duration: options?.openTimeout ?? 10000,
              onTimeout: () => new SocketGenericError({ reason: "OpenTimeout", error: "timeout waiting for \"open\"" })
            }),
            Effect.raceFirst(FiberSet.join(fiberSet))
          )
        }

        open = true

        yield* _(
          Queue.take(sendQueue),
          Effect.tap((chunk) =>
            isCloseEvent(chunk) ?
              Effect.failSync(() => {
                ws.close(chunk.code, chunk.reason)
                return new SocketCloseError({
                  reason: "Close",
                  code: chunk.code,
                  closeReason: chunk.reason
                })
              }) :
              Effect.try({
                try: () => ws.send(chunk),
                catch: (error) => new SocketGenericError({ reason: "Write", error: (error as any).message })
              })
          ),
          Effect.forever,
          FiberSet.run(fiberSet)
        )

        yield* _(
          FiberSet.join(fiberSet),
          Effect.catchIf(
            SocketCloseError.isClean((_) => !closeCodeIsError(_)),
            (_) => Effect.unit
          )
        )
      }).pipe(
        Effect.scoped,
        Effect.interruptible
      )

    const write = (chunk: Uint8Array | CloseEvent) => Queue.offer(sendQueue, chunk)
    const writer = Effect.succeed(write)

    return Socket.of({
      [TypeId]: TypeId,
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
): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown
> =>
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
