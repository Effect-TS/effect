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
    handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void,
    options?: {
      readonly onOpen?: Effect.Effect<void> | undefined
    }
  ) => Effect.Effect<void, SocketError | E, R>
  readonly runRaw: <_, E = never, R = never>(
    handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void,
    options?: {
      readonly onOpen?: Effect.Effect<void> | undefined
    }
  ) => Effect.Effect<void, SocketError | E, R>
  readonly writer: Effect.Effect<
    (chunk: Uint8Array | string | CloseEvent) => Effect.Effect<void, SocketError>,
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
  Effect.gen(function*() {
    const scope = yield* Effect.scope
    const mailbox = yield* Mailbox.make<A, SocketError | IE>()
    const writeScope = yield* Scope.fork(scope, ExecutionStrategy.sequential)
    const write = yield* Scope.extend(self.writer, writeScope)
    function* emit(chunk: Chunk.Chunk<Uint8Array | string | CloseEvent>) {
      for (const data of chunk) {
        yield* write(data)
      }
    }
    const input: AsyncProducer.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array | string | CloseEvent>, unknown> = {
      awaitRead: () => Effect.void,
      emit(chunk) {
        return Effect.catchAllCause(
          Effect.gen(() => emit(chunk)),
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
    }

    yield* self.runRaw((data) => {
      mailbox.unsafeOffer(f(data))
    }).pipe(
      Mailbox.into(mailbox),
      Effect.forkIn(scope),
      Effect.interruptible
    )

    return Channel.embedInput(Mailbox.toChannel(mailbox), input)
  }).pipe(Channel.unwrapScoped)

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
export const WebSocketConstructor: Context.Tag<
  WebSocketConstructor,
  (url: string, protocols?: string | Array<string> | undefined) => globalThis.WebSocket
> = Context
  .GenericTag("@effect/platform/Socket/WebSocketConstructor")

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketConstructorGlobal: Layer.Layer<WebSocketConstructor> = Layer.succeed(
  WebSocketConstructor,
  (url, protocols) => new globalThis.WebSocket(url, protocols)
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url: string | Effect.Effect<string>, options?: {
  readonly closeCodeIsError?: ((code: number) => boolean) | undefined
  readonly openTimeout?: DurationInput | undefined
  readonly protocols?: string | Array<string> | undefined
}): Effect.Effect<Socket, never, WebSocketConstructor> =>
  fromWebSocket(
    Effect.acquireRelease(
      (typeof url === "string" ? Effect.succeed(url) : url).pipe(
        Effect.flatMap((url) => Effect.map(WebSocketConstructor, (f) => f(url, options?.protocols)))
      ),
      (ws) => Effect.sync(() => ws.close(1000))
    ),
    options
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWebSocket = <RO>(
  acquire: Effect.Effect<globalThis.WebSocket, SocketError, RO>,
  options?: {
    readonly closeCodeIsError?: (code: number) => boolean
    readonly openTimeout?: DurationInput
  }
): Effect.Effect<Socket, never, Exclude<RO, Scope.Scope>> =>
  Effect.withFiberRuntime((fiber) => {
    let currentWS: globalThis.WebSocket | undefined
    const latch = Effect.unsafeMakeLatch(false)
    const acquireContext = fiber.currentContext as Context.Context<RO>
    const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError

    const runRaw = <_, E, R>(handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void, opts?: {
      readonly onOpen?: Effect.Effect<void> | undefined
    }) =>
      Effect.scopedWith(Effect.fnUntraced(function*(scope) {
        const fiberSet = yield* FiberSet.make<any, E | SocketError>().pipe(
          Scope.extend(scope)
        )
        const ws = yield* Scope.extend(acquire, scope)
        const run = yield* Effect.provideService(FiberSet.runtime(fiberSet)<R>(), WebSocket, ws)
        let open = false

        function onMessage(event: MessageEvent) {
          if (event.data instanceof Blob) {
            return Effect.promise(() => event.data.arrayBuffer() as Promise<ArrayBuffer>).pipe(
              Effect.andThen((buffer) => handler(new Uint8Array(buffer))),
              run
            )
          }
          const result = handler(event.data)
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
          yield* Deferred.await(openDeferred).pipe(
            Effect.timeoutFail({
              duration: options?.openTimeout ?? 10000,
              onTimeout: () => new SocketGenericError({ reason: "OpenTimeout", cause: "timeout waiting for \"open\"" })
            }),
            Effect.raceFirst(FiberSet.join(fiberSet))
          )
        }
        open = true
        currentWS = ws
        yield* latch.open
        if (opts?.onOpen) yield* opts.onOpen
        return yield* FiberSet.join(fiberSet).pipe(
          Effect.catchIf(
            SocketCloseError.isClean((_) => !closeCodeIsError(_)),
            (_) => Effect.void
          )
        )
      })).pipe(
        Effect.mapInputContext((input: Context.Context<R>) => Context.merge(acquireContext, input)),
        Effect.ensuring(Effect.sync(() => {
          latch.unsafeClose()
          currentWS = undefined
        })),
        Effect.interruptible
      )

    const encoder = new TextEncoder()
    const run = <_, E, R>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void, opts?: {
      readonly onOpen?: Effect.Effect<void> | undefined
    }) =>
      runRaw((data) =>
        typeof data === "string"
          ? handler(encoder.encode(data))
          : data instanceof Uint8Array
          ? handler(data)
          : handler(new Uint8Array(data)), opts)

    const write = (chunk: Uint8Array | string | CloseEvent) =>
      latch.whenOpen(Effect.sync(() => {
        const ws = currentWS!
        if (isCloseEvent(chunk)) {
          ws.close(chunk.code, chunk.reason)
        } else {
          ws.send(chunk)
        }
      }))
    const writer = Effect.succeed(write)

    return Effect.succeed(Socket.of({
      [TypeId]: TypeId,
      run,
      runRaw,
      writer
    }))
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
}): Effect.Effect<Socket, never, Exclude<R, Scope.Scope>> =>
  Effect.withFiberRuntime((fiber) => {
    const latch = Effect.unsafeMakeLatch(false)
    let currentStream: {
      readonly stream: InputTransformStream
      readonly fiberSet: FiberSet.FiberSet<any, any>
    } | undefined
    const acquireContext = fiber.currentContext as Context.Context<R>
    const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError
    const runRaw = <_, E, R>(handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void, opts?: {
      readonly onOpen?: Effect.Effect<void> | undefined
    }) =>
      Effect.scopedWith(Effect.fnUntraced(function*(scope) {
        const stream = yield* Scope.extend(acquire, scope)
        const reader = stream.readable.getReader()
        yield* Scope.addFinalizer(scope, Effect.promise(() => reader.cancel()))
        const fiberSet = yield* FiberSet.make<any, E | SocketError>().pipe(
          Scope.extend(scope)
        )
        const runFork = yield* FiberSet.runtime(fiberSet)<R>()

        yield* Effect.tryPromise({
          try: async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                throw new SocketCloseError({ reason: "Close", code: 1000 })
              }
              const result = handler(value)
              if (Effect.isEffect(result)) {
                runFork(result)
              }
            }
          },
          catch: (cause) => isSocketError(cause) ? cause : new SocketGenericError({ reason: "Read", cause })
        }).pipe(
          FiberSet.run(fiberSet)
        )

        currentStream = { stream, fiberSet }
        yield* latch.open
        if (opts?.onOpen) yield* opts.onOpen

        return yield* FiberSet.join(fiberSet).pipe(
          Effect.catchIf(
            SocketCloseError.isClean((_) => !closeCodeIsError(_)),
            (_) => Effect.void
          )
        )
      })).pipe(
        (_) => _,
        Effect.mapInputContext((input: Context.Context<R>) => Context.merge(acquireContext, input)),
        Effect.ensuring(Effect.sync(() => {
          latch.unsafeClose()
          currentStream = undefined
        })),
        Effect.interruptible
      )

    const encoder = new TextEncoder()
    const run = <_, E, R>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void, opts?: {
      readonly onOpen?: Effect.Effect<void> | undefined
    }) =>
      runRaw((data) =>
        typeof data === "string"
          ? handler(encoder.encode(data))
          : handler(data), opts)

    const writers = new WeakMap<InputTransformStream, WritableStreamDefaultWriter<Uint8Array>>()
    const getWriter = (stream: InputTransformStream) => {
      let writer = writers.get(stream)
      if (!writer) {
        writer = stream.writable.getWriter()
        writers.set(stream, writer)
      }
      return writer
    }
    const write = (chunk: Uint8Array | string | CloseEvent) =>
      latch.whenOpen(Effect.suspend(() => {
        const { fiberSet, stream } = currentStream!
        if (isCloseEvent(chunk)) {
          return Deferred.fail(
            fiberSet.deferred,
            new SocketCloseError({ reason: "Close", code: chunk.code, closeReason: chunk.reason })
          )
        }
        return Effect.promise(() => getWriter(stream).write(typeof chunk === "string" ? encoder.encode(chunk) : chunk))
      }))
    const writer = Effect.acquireRelease(
      Effect.succeed(write),
      () =>
        Effect.promise(async () => {
          if (!currentStream) return
          await getWriter(currentStream.stream).close()
        })
    )

    return Effect.succeed(Socket.of({
      [TypeId]: TypeId,
      run,
      runRaw,
      writer
    }))
  })
