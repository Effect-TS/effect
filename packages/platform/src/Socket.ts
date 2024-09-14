/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as FiberSet from "effect/FiberSet"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import type * as AsyncProducer from "effect/SingleProducerAsyncInput"
import { TypeIdError } from "./Error.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/Socket")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isSocket = (u: unknown): u is Socket => Predicate.hasProperty(u, TypeId)

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
  readonly run: <_, E = never, R = never>(
    handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void
  ) => Effect.Effect<void, SocketError | E, R>
  readonly runRaw: <_, E = never, R = never>(
    handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void
  ) => Effect.Effect<void, SocketError | E, R>
  readonly writer: Effect.Effect<
    (chunk: Uint8Array | string | CloseEvent) => Effect.Effect<boolean>,
    never,
    Scope.Scope
  >
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const CloseEventTypeId: unique symbol = Symbol.for("@effect/platform/Socket/CloseEvent")

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
export const SocketErrorTypeId: unique symbol = Symbol.for("@effect/platform/Socket/SocketError")

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
export class SocketGenericError extends TypeIdError(SocketErrorTypeId, "SocketError")<{
  readonly reason: "Write" | "Read" | "Open" | "OpenTimeout"
  readonly cause: unknown
}> {
  get message() {
    return `An error occurred during ${this.reason}`
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketCloseError extends TypeIdError(SocketErrorTypeId, "SocketError")<{
  readonly reason: "Close"
  readonly code: number
  readonly closeReason?: string | undefined
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
export const toChannelMap = <IE, A>(
  self: Socket,
  f: (data: Uint8Array | string) => A
): Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<Uint8Array | string | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown
> =>
  Effect.scope.pipe(
    Effect.bindTo("scope"),
    Effect.bind("mailbox", () => Mailbox.make<A, SocketError | IE>()),
    Effect.bind("writeScope", ({ scope }) => Scope.fork(scope, ExecutionStrategy.sequential)),
    Effect.bind("write", ({ writeScope }) => Scope.extend(self.writer, writeScope)),
    Effect.let(
      "input",
      (
        { mailbox, write, writeScope }
      ): AsyncProducer.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array | string | CloseEvent>, unknown> => ({
        awaitRead: () => Effect.void,
        emit(chunk) {
          return Effect.catchAllCause(
            Effect.forEach(chunk, write, { discard: true }),
            (cause) => mailbox.failCause(cause)
          )
        },
        error(error) {
          return Effect.zipRight(
            Scope.close(writeScope, Exit.void),
            mailbox.failCause(error)
          )
        },
        done() {
          return Scope.close(writeScope, Exit.void)
        }
      })
    ),
    Effect.tap(({ mailbox, scope }) =>
      self.runRaw((data) => {
        mailbox.unsafeOffer(f(data))
      }).pipe(
        Mailbox.into(mailbox),
        Effect.forkIn(scope),
        Effect.interruptible
      )
    ),
    Effect.map(({ input, mailbox }) => Channel.embedInput(Mailbox.toChannel(mailbox), input)),
    Channel.unwrapScoped
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannel = <IE>(
  self: Socket
): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | string | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown
> => {
  const encoder = new TextEncoder()
  return toChannelMap(self, (data) => typeof data === "string" ? encoder.encode(data) : data)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannelString: {
  (encoding?: string | undefined): <IE>(self: Socket) => Channel.Channel<
    Chunk.Chunk<string>,
    Chunk.Chunk<Uint8Array | string | CloseEvent>,
    SocketError | IE,
    IE,
    void,
    unknown
  >
  <IE>(
    self: Socket,
    encoding?: string | undefined
  ): Channel.Channel<
    Chunk.Chunk<string>,
    Chunk.Chunk<Uint8Array | string | CloseEvent>,
    SocketError | IE,
    IE,
    void,
    unknown
  >
} = dual((args) => isSocket(args[0]), <IE>(
  self: Socket,
  encoding?: string | undefined
): Channel.Channel<
  Chunk.Chunk<string>,
  Chunk.Chunk<Uint8Array | string | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown
> => {
  const decoder = new TextDecoder(encoding)
  return toChannelMap(self, (data) => typeof data === "string" ? data : decoder.decode(data))
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannelWith = <IE = never>() =>
(
  self: Socket
): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | string | CloseEvent>,
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
  Chunk.Chunk<Uint8Array | string | CloseEvent>,
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
 * @category tags
 */
export interface WebSocketConstructor {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const WebSocketConstructor: Context.Tag<WebSocketConstructor, (url: string) => globalThis.WebSocket> = Context
  .GenericTag("@effect/platform/Socket/WebSocketConstructor")

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketConstructorGlobal: Layer.Layer<WebSocketConstructor> = Layer.succeed(
  WebSocketConstructor,
  (url: string) => new globalThis.WebSocket(url)
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url: string | Effect.Effect<string>, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
  readonly openTimeout?: DurationInput
}): Effect.Effect<Socket, never, WebSocketConstructor> =>
  fromWebSocket(
    Effect.acquireRelease(
      (typeof url === "string" ? Effect.succeed(url) : url).pipe(
        Effect.flatMap((url) => Effect.map(WebSocketConstructor, (f) => f(url)))
      ),
      (ws) => Effect.sync(() => ws.close())
    ),
    options
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWebSocket = <R>(
  acquire: Effect.Effect<globalThis.WebSocket, SocketError, R>,
  options?: {
    readonly closeCodeIsError?: (code: number) => boolean
    readonly openTimeout?: DurationInput
  }
): Effect.Effect<Socket, never, Exclude<R, Scope.Scope>> =>
  Effect.withFiberRuntime<Socket, never, Exclude<R, Scope.Scope>>((fiber) =>
    Effect.map(
      Queue.dropping<Uint8Array | string | CloseEvent>(fiber.getFiberRef(currentSendQueueCapacity)),
      (sendQueue) => {
        const acquireContext = fiber.getFiberRef(FiberRef.currentContext) as Context.Context<R>
        const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError
        const runRaw = <_, E, R>(handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void) =>
          acquire.pipe(
            Effect.bindTo("ws"),
            Effect.bind("fiberSet", () => FiberSet.make<any, E | SocketError>()),
            Effect.bind("run", ({ fiberSet, ws }) =>
              Effect.provideService(FiberSet.runtime(fiberSet)<R>(), WebSocket, ws)),
            Effect.tap(({ fiberSet, run, ws }) => {
              let open = false

              function onMessage(event: MessageEvent) {
                const result = handler(
                  typeof event.data === "string"
                    ? event.data
                    : event.data instanceof Uint8Array
                    ? event.data
                    : new Uint8Array(event.data)
                )
                if (Effect.isEffect(result)) {
                  run(result)
                }
              }
              function onError(cause: Event) {
                ws.removeEventListener("message", onMessage)
                ws.removeEventListener("close", onClose)
                Deferred.unsafeDone(
                  fiberSet.deferred,
                  Effect.fail(new SocketGenericError({ reason: open ? "Read" : "Open", cause }))
                )
              }
              function onClose(event: globalThis.CloseEvent) {
                ws.removeEventListener("message", onMessage)
                ws.removeEventListener("error", onError)
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

              ws.addEventListener("close", onClose, { once: true })
              ws.addEventListener("error", onError, { once: true })
              ws.addEventListener("message", onMessage)

              if (ws.readyState !== 1) {
                const openDeferred = Deferred.unsafeMake<void>(fiber.id())
                ws.addEventListener("open", () => {
                  open = true
                  Deferred.unsafeDone(openDeferred, Effect.void)
                }, { once: true })
                return Deferred.await(openDeferred).pipe(
                  Effect.timeoutFail({
                    duration: options?.openTimeout ?? 10000,
                    onTimeout: () =>
                      new SocketGenericError({ reason: "OpenTimeout", cause: "timeout waiting for \"open\"" })
                  }),
                  Effect.raceFirst(FiberSet.join(fiberSet))
                )
              }
              open = true
              return Effect.void
            }),
            Effect.tap(({ fiberSet, ws }) =>
              Queue.take(sendQueue).pipe(
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
                      try: () =>
                        ws.send(chunk),
                      catch: (cause) => new SocketGenericError({ reason: "Write", cause })
                    })
                ),
                Effect.forever,
                FiberSet.run(fiberSet)
              )
            ),
            Effect.tap(({ fiberSet }) =>
              Effect.catchIf(
                FiberSet.join(fiberSet),
                SocketCloseError.isClean((_) => !closeCodeIsError(_)),
                (_) => Effect.void
              )
            ),
            Effect.mapInputContext((input: Context.Context<R | Scope.Scope>) => Context.merge(acquireContext, input)),
            Effect.scoped,
            Effect.interruptible
          )

        const encoder = new TextEncoder()
        const run = <_, E, R>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void) =>
          runRaw((data) =>
            typeof data === "string"
              ? handler(encoder.encode(data))
              : handler(data)
          )

        const write = (chunk: Uint8Array | string | CloseEvent) => Queue.offer(sendQueue, chunk)
        const writer = Effect.succeed(write)

        return Socket.of({
          [TypeId]: TypeId,
          run,
          runRaw,
          writer
        })
      }
    )
  )

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
  Chunk.Chunk<Uint8Array | string | CloseEvent>,
  SocketError | IE,
  IE,
  void,
  unknown,
  WebSocketConstructor
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
}): Layer.Layer<Socket, never, WebSocketConstructor> =>
  Layer.effect(
    Socket,
    makeWebSocket(url, options)
  )

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentSendQueueCapacity: FiberRef.FiberRef<number> = globalValue(
  "@effect/platform/Socket/currentSendQueueCapacity",
  () => FiberRef.unsafeMake(16)
)

/**
 * @since 1.0.0
 * @category models
 */
export interface InputTransformStream {
  readonly readable: ReadableStream<Uint8Array> | ReadableStream<string> | ReadableStream<Uint8Array | string>
  readonly writable: WritableStream<Uint8Array>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromTransformStream = <R>(acquire: Effect.Effect<InputTransformStream, SocketError, R>, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
}): Effect.Effect<Socket, never, Exclude<R, Scope.Scope>> => {
  const EOF = Symbol()
  return Effect.withFiberRuntime<Socket, never, Exclude<R, Scope.Scope>>((fiber) =>
    Effect.map(
      Queue.dropping<Uint8Array | string | CloseEvent | typeof EOF>(fiber.getFiberRef(currentSendQueueCapacity)),
      (sendQueue) => {
        const acquireContext = fiber.getFiberRef(FiberRef.currentContext) as Context.Context<R>
        const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError
        const runRaw = <_, E, R>(handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void) =>
          acquire.pipe(
            Effect.bindTo("stream"),
            Effect.bind("reader", ({ stream }) =>
              Effect.acquireRelease(
                Effect.sync(() => stream.readable.getReader()),
                (reader) =>
                  Effect.promise(() => reader.cancel()).pipe(
                    Effect.tap(() => {
                      reader.releaseLock()
                    })
                  )
              )),
            Effect.bind("writer", ({ stream }) =>
              Effect.acquireRelease(
                Effect.sync(() => stream.writable.getWriter()),
                (reader) => Effect.sync(() => reader.releaseLock())
              )),
            Effect.bind("fiberSet", () => FiberSet.make<any, E | SocketError>()),
            Effect.tap(({ fiberSet, writer }) => {
              const encoder = new TextEncoder()
              return Queue.take(sendQueue).pipe(
                Effect.tap((chunk) => {
                  if (
                    chunk === EOF ||
                    isCloseEvent(chunk)
                  ) {
                    return Effect.zipRight(
                      Effect.promise(() => writer.close()),
                      chunk === EOF ? Effect.interrupt : Effect.fail(
                        new SocketCloseError({
                          reason: "Close",
                          code: chunk.code,
                          closeReason: chunk.reason
                        })
                      )
                    )
                  }
                  return Effect.try({
                    try: () => {
                      if (typeof chunk === "string") {
                        writer.write(encoder.encode(chunk))
                      } else {
                        writer.write(chunk)
                      }
                    },
                    catch: (cause) => new SocketGenericError({ reason: "Write", cause })
                  })
                }),
                Effect.forever,
                FiberSet.run(fiberSet)
              )
            }),
            Effect.tap(({ fiberSet, reader }) =>
              Effect.tryPromise({
                try: () => reader.read(),
                catch: (cause) => new SocketGenericError({ reason: "Read", cause })
              }).pipe(
                Effect.tap((result) => {
                  if (result.done) {
                    return Effect.fail(new SocketCloseError({ reason: "Close", code: 1000 }))
                  }
                  return handler(result.value)
                }),
                Effect.forever,
                FiberSet.run(fiberSet)
              )
            ),
            Effect.tap(({ fiberSet }) =>
              Effect.catchIf(
                FiberSet.join(fiberSet),
                SocketCloseError.isClean((_) => !closeCodeIsError(_)),
                (_) => Effect.void
              )
            ),
            Effect.mapInputContext((input: Context.Context<R | Scope.Scope>) => Context.merge(acquireContext, input)),
            Effect.scoped,
            Effect.interruptible
          )

        const encoder = new TextEncoder()
        const run = <_, E, R>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void) =>
          runRaw((data) =>
            typeof data === "string"
              ? handler(encoder.encode(data))
              : handler(data)
          )

        const write = (chunk: Uint8Array | string | CloseEvent) => Queue.offer(sendQueue, chunk)
        const writer = Effect.acquireRelease(
          Effect.succeed(write),
          () => Queue.offer(sendQueue, EOF)
        )

        return Socket.of({
          [TypeId]: TypeId,
          run,
          runRaw,
          writer
        })
      }
    )
  )
}
