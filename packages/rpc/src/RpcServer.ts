/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as HttpApp from "@effect/platform/HttpApp"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpRouter from "@effect/platform/HttpRouter"
import type * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import type * as Socket from "@effect/platform/Socket"
import * as SocketServer from "@effect/platform/SocketServer"
import * as Transferable from "@effect/platform/Transferable"
import type { WorkerError } from "@effect/platform/WorkerError"
import * as WorkerRunner from "@effect/platform/WorkerRunner"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as FiberSet from "effect/FiberSet"
import { constant, constTrue, constVoid, identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import { type ParseError, TreeFormatter } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Runtime from "effect/Runtime"
import * as RuntimeFlags from "effect/RuntimeFlags"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import type * as Types from "effect/Types"
import { withRun } from "./internal/utils.js"
import * as Rpc from "./Rpc.js"
import type * as RpcGroup from "./RpcGroup.js"
import type {
  FromClient,
  FromClientEncoded,
  FromServer,
  FromServerEncoded,
  Request,
  RequestEncoded
} from "./RpcMessage.js"
import { constEof, constPong, RequestId, ResponseDefectEncoded } from "./RpcMessage.js"
import type { RpcMiddleware } from "./RpcMiddleware.js"
import * as RpcSchema from "./RpcSchema.js"
import * as RpcSerialization from "./RpcSerialization.js"
import type { InitialMessage } from "./RpcWorker.js"

/**
 * @since 1.0.0
 * @category server
 */
export interface RpcServer<A extends Rpc.Any> {
  readonly write: (clientId: number, message: FromClient<A>) => Effect.Effect<void>
  readonly disconnect: (clientId: number) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category server
 */
export const makeNoSerialization: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly onFromServer: (response: FromServer<Rpcs>) => Effect.Effect<void>
    readonly disableTracing?: boolean | undefined
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableClientAcks?: boolean | undefined
    readonly concurrency?: number | "unbounded" | undefined
    readonly disableFatalDefects?: boolean | undefined
  }
) => Effect.Effect<
  RpcServer<Rpcs>,
  never,
  Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Scope.Scope
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly onFromServer: (response: FromServer<Rpcs>) => Effect.Effect<void>
    readonly disableTracing?: boolean | undefined
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableClientAcks?: boolean | undefined
    readonly concurrency?: number | "unbounded" | undefined
    readonly disableFatalDefects?: boolean | undefined
  }
) {
  const enableTracing = options.disableTracing !== true
  const enableSpanPropagation = options.disableSpanPropagation !== true
  const supportsAck = options.disableClientAcks !== true
  const spanPrefix = options.spanPrefix ?? "RpcServer"
  const concurrency = options.concurrency ?? "unbounded"
  const disableFatalDefects = options.disableFatalDefects ?? false
  const context = yield* Effect.context<Rpc.ToHandler<Rpcs> | Scope.Scope>()
  const scope = Context.get(context, Scope.Scope)
  const fiberSet = yield* FiberSet.make()
  const runFork = yield* FiberSet.runtime(fiberSet)().pipe(
    Effect.interruptible
  )
  const concurrencySemaphore = concurrency === "unbounded"
    ? undefined
    : Effect.unsafeMakeSemaphore(concurrency).withPermits(1)

  type Client = {
    readonly id: number
    readonly latches: Map<RequestId, Effect.Latch>
    readonly fibers: Map<RequestId, Fiber.RuntimeFiber<unknown, any>>
    ended: boolean
  }

  const clients = new Map<number, Client>()
  let isShutdown = false
  const shutdownLatch = Effect.unsafeMakeLatch(false)
  yield* Scope.addFinalizer(
    scope,
    Effect.suspend(() => {
      isShutdown = true
      for (const client of clients.values()) {
        client.ended = true
        if (client.fibers.size === 0) {
          runFork(endClient(client))
          continue
        }
        for (const fiber of client.fibers.values()) {
          fiber.unsafeInterruptAsFork(fiberIdTransientInterrupt)
        }
      }
      if (clients.size === 0) {
        return Effect.void
      }
      return shutdownLatch.await
    })
  )

  const disconnect = (clientId: number) =>
    Effect.suspend(() => {
      const client = clients.get(clientId)
      if (!client) return Effect.void
      for (const fiber of client.fibers.values()) {
        fiber.unsafeInterruptAsFork(fiberIdTransientInterrupt)
      }
      clients.delete(clientId)
      return Effect.void
    })

  const write = (clientId: number, message: FromClient<Rpcs>): Effect.Effect<void> =>
    Effect.catchAllDefect(
      Effect.withFiberRuntime((requestFiber) => {
        if (isShutdown) return Effect.interrupt
        let client = clients.get(clientId)
        if (!client) {
          client = {
            id: clientId,
            latches: new Map(),
            fibers: new Map(),
            ended: false
          }
          clients.set(clientId, client)
        } else if (client.ended) {
          return Effect.interrupt
        }

        switch (message._tag) {
          case "Request": {
            return handleRequest(requestFiber, client, message)
          }
          case "Ack": {
            const latch = client.latches.get(message.requestId)
            return latch ? latch.open : Effect.void
          }
          case "Interrupt": {
            const fiber = client.fibers.get(message.requestId)
            return fiber ? Fiber.interruptAsFork(fiber, fiberIdClientInterrupt) : options.onFromServer({
              _tag: "Exit",
              clientId,
              requestId: message.requestId,
              exit: Exit.interrupt(FiberId.none)
            })
          }
          case "Eof": {
            client.ended = true
            if (client.fibers.size > 0) return Effect.void
            return endClient(client)
          }
          default: {
            return sendDefect(client, `Unknown request tag: ${(message as any)._tag}`)
          }
        }
      }),
      (defect) => sendDefect(clients.get(clientId)!, defect)
    )

  const endClient = (client: Client) => {
    clients.delete(client.id)
    const write = options.onFromServer({
      _tag: "ClientEnd",
      clientId: client.id
    })
    if (isShutdown && clients.size === 0) {
      return Effect.zipRight(write, shutdownLatch.open)
    }
    return write
  }

  const handleRequest = (
    requestFiber: Fiber.RuntimeFiber<any, any>,
    client: Client,
    request: Request<Rpcs>
  ): Effect.Effect<void> => {
    if (client.fibers.has(request.id)) {
      return Effect.flatMap(
        Fiber.await(client.fibers.get(request.id)!),
        () => handleRequest(requestFiber, client, request)
      )
    }
    const rpc = group.requests.get(request.tag) as any as Rpc.AnyWithProps
    const entry = context.unsafeMap.get(rpc?.key) as Rpc.Handler<Rpcs["_tag"]>
    if (!rpc || !entry) {
      const write = Effect.catchAllDefect(
        options.onFromServer({
          _tag: "Exit",
          clientId: client.id,
          requestId: request.id,
          exit: Exit.die(`Unknown request tag: ${request.tag}`)
        }),
        (defect) => sendDefect(client, defect)
      )
      if (!client.ended || client.fibers.size > 0) return write
      return Effect.zipRight(write, endClient(client))
    }
    const isStream = RpcSchema.isStreamSchema(rpc.successSchema)
    const result = entry.handler(request.payload, {
      clientId: client.id,
      headers: request.headers
    })

    // if the handler requested forking, then we skip the concurrency control
    const isWrapper = Rpc.isWrapper(result)
    const isFork = isWrapper && result.fork
    const isUninterruptible = isWrapper && result.uninterruptible
    // unwrap the fork data type
    const streamOrEffect = isWrapper ? result.value : result
    const handler = applyMiddleware(
      rpc,
      context,
      client.id,
      request.payload,
      request.headers,
      isStream
        ? streamEffect(client, request, streamOrEffect)
        : streamOrEffect as Effect.Effect<any>
    )
    let responded = false
    let effect = Effect.matchCauseEffect(
      isUninterruptible ? handler : Effect.interruptible(handler),
      {
        onSuccess: (value) => {
          responded = true
          return options.onFromServer({
            _tag: "Exit",
            clientId: client.id,
            requestId: request.id,
            exit: Exit.succeed(value as any)
          })
        },
        onFailure: (cause) => {
          responded = true
          if (!disableFatalDefects && Cause.isDie(cause) && !Cause.isInterrupted(cause)) {
            return sendDefect(client, Cause.squash(cause))
          }
          return options.onFromServer({
            _tag: "Exit",
            clientId: client.id,
            requestId: request.id,
            exit: Exit.failCause(cause)
          })
        }
      }
    )
    if (enableTracing) {
      const parentSpan = requestFiber.currentContext.unsafeMap.get(Tracer.ParentSpan.key) as Tracer.AnySpan | undefined
      effect = Effect.withSpan(effect, `${spanPrefix}.${request.tag}`, {
        captureStackTrace: false,
        attributes: {
          requestId: String(request.id),
          ...options.spanAttributes
        },
        parent: enableSpanPropagation && request.spanId ?
          {
            _tag: "ExternalSpan",
            traceId: request.traceId!,
            spanId: request.spanId,
            sampled: request.sampled!,
            context: Context.empty()
          } :
          undefined,
        links: enableSpanPropagation && parentSpan ?
          [{
            _tag: "SpanLink",
            span: parentSpan,
            attributes: {}
          }] :
          undefined
      })
    }
    if (!isFork && concurrencySemaphore) {
      effect = concurrencySemaphore(effect)
    }
    const runtime = Runtime.make({
      context: Context.merge(entry.context, requestFiber.currentContext),
      fiberRefs: requestFiber.getFiberRefs(),
      runtimeFlags: RuntimeFlags.disable(Runtime.defaultRuntime.runtimeFlags, RuntimeFlags.Interruption)
    })
    const fiber = Runtime.runFork(runtime, effect)
    client.fibers.set(request.id, fiber)
    fiber.addObserver((exit) => {
      if (!responded && exit._tag === "Failure") {
        FiberSet.unsafeAdd(
          fiberSet,
          Runtime.runFork(
            runtime,
            options.onFromServer({
              _tag: "Exit",
              clientId: client.id,
              requestId: request.id,
              exit: Exit.interrupt(FiberId.none)
            })
          )
        )
      }
      client.fibers.delete(request.id)
      client.latches.delete(request.id)
      if (client.ended && client.fibers.size === 0) {
        FiberSet.unsafeAdd(
          fiberSet,
          Runtime.runFork(runtime, endClient(client))
        )
      }
    })
    return Effect.void
  }

  const streamEffect = (
    client: Client,
    request: Request<Rpcs>,
    stream: Stream.Stream<any, any> | Effect.Effect<Mailbox.ReadonlyMailbox<any, any>, any, Scope.Scope>
  ) => {
    let latch = client.latches.get(request.id)
    if (supportsAck && !latch) {
      latch = Effect.unsafeMakeLatch(false)
      client.latches.set(request.id, latch)
    }
    if (Effect.isEffect(stream)) {
      let done = false
      return stream.pipe(
        Effect.flatMap((mailbox) =>
          Effect.whileLoop({
            while: () => !done,
            body: constant(Effect.flatMap(mailbox.takeAll, ([chunk, done_]) => {
              done = done_
              if (!Chunk.isNonEmpty(chunk)) return Effect.void
              const write = options.onFromServer({
                _tag: "Chunk",
                clientId: client.id,
                requestId: request.id,
                values: Chunk.toReadonlyArray(chunk)
              })
              if (!latch) return write
              latch.unsafeClose()
              return Effect.zipRight(write, latch.await)
            })),
            step: constVoid
          })
        ),
        Effect.scoped
      )
    }
    return Stream.runForEachChunk(stream, (chunk) => {
      if (!Chunk.isNonEmpty(chunk)) return Effect.void
      const write = options.onFromServer({
        _tag: "Chunk",
        clientId: client.id,
        requestId: request.id,
        values: Chunk.toReadonlyArray(chunk)
      })
      if (!latch) return write
      latch.unsafeClose()
      return Effect.zipRight(write, latch.await)
    })
  }

  const sendDefect = (client: Client, defect: unknown) =>
    Effect.suspend(() => {
      const shouldEnd = client.ended && client.fibers.size === 0
      const write = options.onFromServer({
        _tag: "Defect",
        clientId: client.id,
        defect
      })
      if (!shouldEnd) return write
      return Effect.zipRight(write, endClient(client))
    })

  return identity<RpcServer<Rpcs>>({
    write,
    disconnect
  })
})

const applyMiddleware = <A, E, R>(
  rpc: Rpc.AnyWithProps,
  context: Context.Context<never>,
  clientId: number,
  payload: A,
  headers: Headers.Headers,
  handler: Effect.Effect<A, E, R>
) => {
  if (rpc.middlewares.size === 0) {
    return handler
  }

  const options = {
    rpc,
    payload,
    headers,
    clientId
  }

  for (const tag of rpc.middlewares) {
    if (tag.wrap) {
      const middleware = Context.unsafeGet(context, tag)
      handler = middleware({ ...options, next: handler as any })
    } else if (tag.optional) {
      const middleware = Context.unsafeGet(context, tag) as RpcMiddleware<any, any>
      const previous = handler
      handler = Effect.matchEffect(middleware(options), {
        onFailure: () => previous,
        onSuccess: tag.provides !== undefined
          ? (value) => Effect.provideService(previous, tag.provides as any, value)
          : (_) => previous
      })
    } else {
      const middleware = Context.unsafeGet(context, tag) as RpcMiddleware<any, any>
      handler = tag.provides !== undefined
        ? Effect.provideServiceEffect(handler, tag.provides as any, middleware(options))
        : Effect.zipRight(middleware(options), handler)
    }
  }

  return handler
}

/**
 * @since 1.0.0
 * @category server
 */
export const make: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?:
    | {
      readonly disableTracing?: boolean | undefined
      readonly spanPrefix?: string | undefined
      readonly spanAttributes?: Record<string, unknown> | undefined
      readonly concurrency?: number | "unbounded" | undefined
      readonly disableFatalDefects?: boolean | undefined
    }
    | undefined
) => Effect.Effect<
  never,
  never,
  Protocol | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.Context<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly concurrency?: number | "unbounded" | undefined
    readonly disableFatalDefects?: boolean | undefined
  }
) {
  const { disconnects, end, run, send, supportsAck, supportsSpanPropagation, supportsTransferables } = yield* Protocol
  const context = yield* Effect.context<Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs>>()
  const scope = yield* Scope.make()

  const server = yield* makeNoSerialization(group, {
    ...options,
    disableClientAcks: !supportsAck,
    disableSpanPropagation: !supportsSpanPropagation,
    onFromServer(response): Effect.Effect<void> {
      const client = clients.get(response.clientId)
      if (!client) return Effect.void
      switch (response._tag) {
        case "Chunk": {
          const schemas = client.schemas.get(response.requestId)
          if (!schemas) return Effect.void
          return handleEncode(
            client,
            response.requestId,
            schemas.collector,
            Effect.provide(schemas.encodeChunk(response.values), schemas.context),
            (values) => ({ _tag: "Chunk", requestId: String(response.requestId), values })
          )
        }
        case "Exit": {
          const schemas = client.schemas.get(response.requestId)
          if (!schemas) return Effect.void
          client.schemas.delete(response.requestId)
          return handleEncode(
            client,
            response.requestId,
            schemas.collector,
            Effect.provide(schemas.encodeExit(response.exit), schemas.context),
            (exit) => ({ _tag: "Exit", requestId: String(response.requestId), exit })
          )
        }
        case "Defect": {
          return sendDefect(client, response.defect)
        }
        case "ClientEnd": {
          clients.delete(response.clientId)
          return end(response.clientId)
        }
      }
    }
  }).pipe(Scope.extend(scope))

  // handle disconnects
  yield* Effect.fork(Effect.interruptible(Effect.whileLoop({
    while: constTrue,
    body: constant(Effect.flatMap(disconnects.take, (clientId) => {
      clients.delete(clientId)
      return server.disconnect(clientId)
    })),
    step: constVoid
  })))

  type Schemas = {
    readonly decode: (u: unknown) => Effect.Effect<Rpc.Payload<Rpcs>, ParseError>
    readonly encodeChunk: (u: ReadonlyArray<unknown>) => Effect.Effect<NonEmptyReadonlyArray<unknown>, ParseError>
    readonly encodeExit: (u: unknown) => Effect.Effect<Schema.ExitEncoded<unknown, unknown, unknown>, ParseError>
    readonly context: Context.Context<never>
    readonly collector?: Transferable.CollectorService | undefined
  }

  const schemasCache = new WeakMap<any, Schemas>()
  const getSchemas = (rpc: Rpc.AnyWithProps) => {
    let schemas = schemasCache.get(rpc)
    if (!schemas) {
      const entry = context.unsafeMap.get(rpc.key) as Rpc.Handler<Rpcs["_tag"]>
      const streamSchemas = RpcSchema.getStreamSchemas(rpc.successSchema.ast)
      schemas = {
        decode: Schema.decodeUnknown(rpc.payloadSchema as any),
        encodeChunk: Schema.encodeUnknown(
          Schema.Array(Option.isSome(streamSchemas) ? streamSchemas.value.success : Schema.Any)
        ) as any,
        encodeExit: Schema.encodeUnknown(Rpc.exitSchema(rpc as any)) as any,
        context: entry.context
      }
      schemasCache.set(rpc, schemas)
    }
    return schemas
  }

  type Client = {
    readonly id: number
    readonly schemas: Map<RequestId, Schemas>
  }
  const clients = new Map<number, Client>()

  const handleEncode = <A, R>(
    client: Client,
    requestId: RequestId,
    collector: Transferable.CollectorService | undefined,
    effect: Effect.Effect<A, ParseError, R>,
    onSuccess: (a: A) => FromServerEncoded
  ) =>
    (collector ? Effect.provideService(effect, Transferable.Collector, collector) : effect).pipe(
      Effect.flatMap((a) => send(client.id, onSuccess(a), collector && collector.unsafeClear())),
      Effect.catchAllCause((cause) => {
        client.schemas.delete(requestId)
        const defect = Cause.squash(Cause.map(cause, TreeFormatter.formatErrorSync))
        return Effect.zipRight(
          sendRequestDefect(client, requestId, defect),
          server.write(client.id, { _tag: "Interrupt", requestId, interruptors: [] })
        )
      })
    )

  const sendRequestDefect = (client: Client, requestId: RequestId, defect: unknown) =>
    Effect.catchAllCause(
      send(client.id, {
        _tag: "Exit",
        requestId: String(requestId),
        exit: {
          _tag: "Failure",
          cause: {
            _tag: "Die",
            defect
          }
        }
      }),
      (cause) => sendDefect(client, Cause.squash(cause))
    )

  const sendDefect = (client: Client, defect: unknown) =>
    Effect.catchAllCause(
      send(client.id, { _tag: "Defect", defect }),
      (cause) =>
        Effect.annotateLogs(Effect.logDebug(cause), {
          module: "RpcServer",
          method: "sendDefect"
        })
    )

  // main server loop
  return yield* run((clientId, request) => {
    let client = clients.get(clientId)
    if (!client) {
      client = {
        id: clientId,
        schemas: new Map()
      }
      clients.set(clientId, client)
    }

    switch (request._tag) {
      case "Request": {
        const tag = Predicate.hasProperty(request, "tag") ? request.tag as string : ""
        const rpc = group.requests.get(tag)
        if (!rpc) {
          return sendDefect(client, `Unknown request tag: ${tag}`)
        }
        let requestId: RequestId
        switch (typeof request.id) {
          case "bigint":
          case "string": {
            requestId = RequestId(request.id)
            break
          }
          default: {
            return sendDefect(client, `Invalid request id: ${request.id}`)
          }
        }
        const schemas = getSchemas(rpc as any)
        return Effect.matchEffect(
          Effect.provide(schemas.decode(request.payload), schemas.context),
          {
            onFailure: (error) => sendRequestDefect(client, requestId, TreeFormatter.formatErrorSync(error)),
            onSuccess: (payload) => {
              client.schemas.set(
                requestId,
                supportsTransferables ?
                  {
                    ...schemas,
                    collector: Transferable.unsafeMakeCollector()
                  } :
                  schemas
              )
              return server.write(clientId, {
                ...request,
                id: requestId,
                payload,
                headers: Headers.fromInput(request.headers)
              } as any)
            }
          }
        )
      }
      case "Ping": {
        return Effect.catchAllCause(
          send(client.id, constPong),
          (cause) => sendDefect(client, Cause.squash(cause))
        )
      }
      case "Eof": {
        return server.write(clientId, request)
      }
      case "Ack": {
        return server.write(clientId, {
          ...request,
          requestId: RequestId(request.requestId)
        })
      }
      case "Interrupt": {
        return server.write(clientId, {
          ...request,
          requestId: RequestId(request.requestId),
          interruptors: []
        })
      }
      default: {
        return sendDefect(client, `Unknown request tag: ${(request as any)._tag}`)
      }
    }
  }).pipe(
    Effect.interruptible,
    Effect.tapErrorCause((cause) => Effect.logFatal("BUG: RpcServer protocol crashed", cause)),
    Effect.onExit((exit) => Scope.close(scope, exit)),
    Effect.withUnhandledErrorLogLevel(Option.none())
  )
})

/**
 * @since 1.0.0
 * @category server
 */
export const layer = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly concurrency?: number | "unbounded" | undefined
    readonly disableFatalDefects?: boolean | undefined
  }
): Layer.Layer<
  never,
  never,
  | Protocol
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> => Layer.scopedDiscard(Effect.forkScoped(Effect.interruptible(make(group, options))))

/**
 * Create a RPC server that registers a HTTP route with a `HttpLayerRouter`.
 *
 * It defaults to using websockets for communication, but can be configured to
 * use HTTP.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerHttpRouter = <Rpcs extends Rpc.Any>(options: {
  readonly group: RpcGroup.RpcGroup<Rpcs>
  readonly path: HttpRouter.PathInput
  readonly protocol?: "http" | "websocket" | undefined
  readonly disableTracing?: boolean | undefined
  readonly spanPrefix?: string | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly concurrency?: number | "unbounded" | undefined
  readonly disableFatalDefects?: boolean | undefined
}): Layer.Layer<
  never,
  never,
  | RpcSerialization.RpcSerialization
  | HttpLayerRouter.HttpRouter
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> =>
  layer(options.group, options).pipe(
    Layer.provide(
      options.protocol === "http"
        ? layerProtocolHttpRouter(options)
        : layerProtocolWebsocketRouter(options)
    )
  )

/**
 * @since 1.0.0
 * @category protocol
 */
export class Protocol extends Context.Tag("@effect/rpc/RpcServer/Protocol")<Protocol, {
  readonly run: (
    f: (clientId: number, data: FromClientEncoded) => Effect.Effect<void>
  ) => Effect.Effect<never>
  readonly disconnects: Mailbox.ReadonlyMailbox<number>
  readonly send: (
    clientId: number,
    response: FromServerEncoded,
    transferables?: ReadonlyArray<globalThis.Transferable>
  ) => Effect.Effect<void>
  readonly end: (clientId: number) => Effect.Effect<void>
  readonly clientIds: Effect.Effect<ReadonlySet<number>>
  readonly initialMessage: Effect.Effect<Option.Option<unknown>>
  readonly supportsAck: boolean
  readonly supportsTransferables: boolean
  readonly supportsSpanPropagation: boolean
}>() {
  /**
   * @since 1.0.0
   */
  static make = withRun<Protocol["Type"]>()
}

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolSocketServer = Effect.gen(function*() {
  const server = yield* SocketServer.SocketServer
  const { onSocket, protocol } = yield* makeSocketProtocol
  yield* server.run(Effect.fnUntraced(onSocket, Effect.scoped)).pipe(
    Effect.interruptible,
    Effect.forkScoped
  )
  return protocol
})

/**
 * A rpc protocol that uses `SocketServer` for communication.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolSocketServer: Layer.Layer<
  Protocol,
  never,
  RpcSerialization.RpcSerialization | SocketServer.SocketServer
> = Layer.scoped(Protocol, makeProtocolSocketServer)

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolWithHttpAppWebsocket: Effect.Effect<
  {
    readonly protocol: Protocol["Type"]
    readonly httpApp: HttpApp.Default<never, Scope.Scope>
  },
  never,
  RpcSerialization.RpcSerialization
> = Effect.gen(function*() {
  const { onSocket, protocol } = yield* makeSocketProtocol

  const httpApp: HttpApp.Default<never, Scope.Scope> = Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const socket = yield* Effect.orDie(request.upgrade)
    yield* onSocket(socket, Object.entries(request.headers))
    return HttpServerResponse.empty()
  })

  return { protocol, httpApp } as const
})

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolWebsocket: <I = HttpRouter.Default>(
  options: {
    readonly path: HttpRouter.PathInput
    readonly routerTag?: Context.Tag<I, HttpRouter.HttpRouter.Service<any, any>>
  }
) => Effect.Effect<
  Protocol["Type"],
  never,
  RpcSerialization.RpcSerialization | I
> = Effect.fnUntraced(function*<I = HttpRouter.Default>(options: {
  readonly path: HttpRouter.PathInput
  readonly routerTag?: Context.Tag<I, HttpRouter.HttpRouter.Service<any, any>>
}) {
  const { httpApp, protocol } = yield* makeProtocolWithHttpAppWebsocket
  const router =
    yield* (options.routerTag ?? HttpRouter.Default as any as Context.Tag<I, HttpRouter.HttpRouter.Service<any, any>>)
  yield* router.get(options.path, httpApp)
  return protocol
})

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolWebsocketRouter: (
  options: {
    readonly path: HttpRouter.PathInput
  }
) => Effect.Effect<
  Protocol["Type"],
  never,
  RpcSerialization.RpcSerialization | HttpLayerRouter.HttpRouter
> = Effect.fnUntraced(function*(options: {
  readonly path: HttpRouter.PathInput
}) {
  const router = yield* HttpLayerRouter.HttpRouter
  const { httpApp, protocol } = yield* makeProtocolWithHttpAppWebsocket
  yield* router.add("GET", options.path, httpApp)
  return protocol
})

/**
 * A rpc protocol that uses websockets for communication.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolWebsocket = <I = HttpRouter.Default>(options: {
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
}): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization> => {
  const routerTag = options.routerTag ??
    HttpRouter.Default as any as HttpRouter.HttpRouter.TagClass<I, string, any, any>
  return Layer.effect(Protocol, makeProtocolWebsocket(options)).pipe(
    Layer.provide(routerTag.Live)
  )
}

/**
 * A rpc protocol that uses websockets for communication.
 *
 * Uses a `HttpLayerRouter` to provide the websocket endpoint.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolWebsocketRouter = (options: {
  readonly path: HttpLayerRouter.PathInput
}): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | HttpLayerRouter.HttpRouter> =>
  Layer.effect(Protocol, makeProtocolWebsocketRouter(options))

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolWithHttpApp: Effect.Effect<
  {
    readonly protocol: Protocol["Type"]
    readonly httpApp: HttpApp.Default<never, Scope.Scope>
  },
  never,
  RpcSerialization.RpcSerialization
> = Effect.gen(function*() {
  const serialization = yield* RpcSerialization.RpcSerialization
  const includesFraming = serialization.includesFraming
  const isBinary = !serialization.contentType.includes("json")

  const disconnects = yield* Mailbox.make<number>()
  let writeRequest!: (clientId: number, message: FromClientEncoded) => Effect.Effect<void>

  let clientId = 0

  type Client = {
    readonly write: (bytes: FromServerEncoded) => Effect.Effect<void>
    readonly end: Effect.Effect<void>
  }
  const clients = new Map<number, Client>()
  const clientIds = new Set<number>()

  const encoder = new TextEncoder()

  const httpApp: HttpApp.Default<never, Scope.Scope> = Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const scope = yield* Effect.scope
    const requestHeaders = Object.entries(request.headers)
    const data = yield* Effect.orDie<string | Uint8Array<ArrayBuffer>, HttpServerError.HttpServerError, never>(
      isBinary ? Effect.map(request.arrayBuffer, (ab) => new Uint8Array(ab)) : request.text
    )
    const id = clientId++
    const mailbox = yield* Mailbox.make<Uint8Array | FromServerEncoded>()
    const parser = serialization.unsafeMake()

    const offer = (data: Uint8Array | string) =>
      typeof data === "string" ? mailbox.offer(encoder.encode(data)) : mailbox.offer(data)

    clientIds.add(id)
    const client: Client = {
      write: !includesFraming ? ((response) => mailbox.offer(response)) : (response) => {
        try {
          const encoded = parser.encode(response)
          if (encoded === undefined) return Effect.void
          return offer(encoded)
        } catch (cause) {
          return offer(parser.encode(ResponseDefectEncoded(cause))!)
        }
      },
      end: mailbox.end
    }
    clients.set(id, client)

    yield* Scope.addFinalizerExit(scope, () => {
      clientIds.delete(id)
      clients.delete(id)
      disconnects.unsafeOffer(id)
      if (mailbox.unsafeSize()._tag === "None") return Effect.void
      return Effect.forEach(
        requestIds,
        (requestId) => writeRequest(id, { _tag: "Interrupt", requestId: String(requestId) }),
        { discard: true }
      )
    })

    const requestIds: Array<RequestId> = []

    try {
      const decoded = parser.decode(data) as ReadonlyArray<FromClientEncoded>
      for (const message of decoded) {
        if (message._tag === "Request") {
          requestIds.push(RequestId(message.id))
          ;(message as Types.Mutable<RequestEncoded>).headers = requestHeaders.concat(
            message.headers
          )
        }
        yield* writeRequest(id, message)
      }
    } catch (cause) {
      yield* client.write(ResponseDefectEncoded(cause))
    }

    yield* writeRequest(id, constEof)

    if (!includesFraming) {
      const responses = Arr.empty<FromServerEncoded>()
      while (true) {
        const [items, done] = yield* mailbox.takeAll
        // eslint-disable-next-line no-restricted-syntax
        responses.push(...items as any)
        if (done) break
      }
      return HttpServerResponse.text(parser.encode(responses) as string, { contentType: serialization.contentType })
    }

    const [initialChunk, done] = yield* mailbox.takeAll
    if (done) {
      return HttpServerResponse.uint8Array(mergeUint8Arrays(initialChunk as Chunk.Chunk<Uint8Array>), {
        contentType: serialization.contentType
      })
    }

    return HttpServerResponse.stream(
      Stream.fromChunk(initialChunk as Chunk.Chunk<Uint8Array>).pipe(
        Stream.concat(Mailbox.toStream(mailbox as Mailbox.ReadonlyMailbox<Uint8Array>))
      ),
      { contentType: serialization.contentType }
    )
  }).pipe(
    Effect.interruptible,
    Effect.withUnhandledErrorLogLevel(Option.none())
  )

  const protocol = yield* Protocol.make((writeRequest_) => {
    writeRequest = writeRequest_
    return Effect.succeed({
      disconnects,
      send(clientId, response) {
        const client = clients.get(clientId)
        if (!client) return Effect.void
        return client.write(response)
      },
      end(clientId) {
        const client = clients.get(clientId)
        if (!client) return Effect.void
        return client.end
      },
      clientIds: Effect.sync(() => clientIds),
      initialMessage: Effect.succeedNone,
      supportsAck: false,
      supportsTransferables: false,
      supportsSpanPropagation: false
    })
  })

  return { protocol, httpApp } as const
})

const mergeUint8Arrays = (arrays: Chunk.Chunk<Uint8Array>) => {
  if (arrays.length === 0) return new Uint8Array(0)
  if (arrays.length === 1) return Chunk.unsafeHead(arrays)
  const length = Chunk.reduce(arrays, 0, (acc, a) => acc + a.length)
  const result = new Uint8Array(length)
  let offset = 0
  for (const array of arrays) {
    result.set(array, offset)
    offset += array.length
  }
  return result
}

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolHttp = Effect.fnUntraced(function*<I = HttpRouter.Default>(options: {
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
}) {
  const { httpApp, protocol } = yield* makeProtocolWithHttpApp
  const router =
    yield* (options.routerTag ?? HttpRouter.Default as any as HttpRouter.HttpRouter.TagClass<I, string, any, any>)
  yield* router.post(options.path, httpApp)
  return protocol
})

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolHttpRouter = Effect.fnUntraced(function*(options: {
  readonly path: HttpRouter.PathInput
}) {
  const router = yield* HttpLayerRouter.HttpRouter
  const { httpApp, protocol } = yield* makeProtocolWithHttpApp
  yield* router.add("POST", options.path, httpApp)
  return protocol
})

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolWorkerRunner: Effect.Effect<
  Protocol["Type"],
  WorkerError,
  WorkerRunner.PlatformRunner | Scope.Scope
> = Protocol.make(Effect.fnUntraced(function*(writeRequest) {
  const fiber = yield* Effect.withFiberRuntime<Fiber.RuntimeFiber<void>>(Effect.succeed as any)
  const runner = yield* WorkerRunner.PlatformRunner
  const closeLatch = yield* WorkerRunner.CloseLatch
  const backing = yield* runner.start<FromClientEncoded | InitialMessage.Encoded, FromServerEncoded>(closeLatch)
  const initialMessage = yield* Deferred.make<unknown>()
  const clientIds = new Set<number>()
  const disconnects = yield* Mailbox.make<number>()

  yield* Deferred.await(closeLatch).pipe(
    Effect.onExit(() => {
      fiber.currentScheduler.scheduleTask(() => fiber.unsafeInterruptAsFork(fiber.id()), 0)
      return Effect.void
    }),
    Effect.forkScoped
  )

  yield* backing.run((clientId, message) => {
    clientIds.add(clientId)
    if (message._tag === "InitialMessage") {
      return Deferred.succeed(initialMessage, message.value)
    }
    return writeRequest(clientId, message)
  }).pipe(
    Effect.withUnhandledErrorLogLevel(Option.none())
  )

  yield* disconnects.take.pipe(
    Effect.tap((clientId) => {
      clientIds.delete(clientId)
      return disconnects.offer(clientId)
    }),
    Effect.forkScoped
  )

  return {
    disconnects,
    send: backing.send,
    end(_clientId) {
      return Effect.void
    },
    clientIds: Effect.sync(() => clientIds),
    initialMessage: Effect.asSome(Deferred.await(initialMessage)),
    supportsAck: true,
    supportsTransferables: true,
    supportsSpanPropagation: true
  }
}))

/**
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolWorkerRunner: Layer.Layer<
  Protocol,
  WorkerError,
  WorkerRunner.PlatformRunner
> = Layer.scoped(Protocol, makeProtocolWorkerRunner)

/**
 * A rpc protocol that uses streaming http for communication.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolHttp = <I = HttpRouter.Default>(options: {
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
}): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization> => {
  const routerTag = options.routerTag ??
    HttpRouter.Default as any as HttpRouter.HttpRouter.TagClass<I, string, any, any>
  return Layer.effect(Protocol, makeProtocolHttp(options)).pipe(
    Layer.provide(routerTag.Live)
  )
}

/**
 * A rpc protocol that uses streaming http for communication.
 *
 * Uses a `HttpLayerRouter` to provide the http endpoint.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolHttpRouter = (options: {
  readonly path: HttpRouter.PathInput
}): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | HttpLayerRouter.HttpRouter> =>
  Layer.effect(Protocol, makeProtocolHttpRouter(options))

/**
 * @since 1.0.0
 * @category http app
 */
export const toHttpApp: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
  } | undefined
) => Effect.Effect<
  HttpApp.Default<never, Scope.Scope>,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
  }
) {
  const { httpApp, protocol } = yield* makeProtocolWithHttpApp
  yield* make(group, options).pipe(
    Effect.provideService(Protocol, protocol),
    Effect.interruptible,
    Effect.forkScoped
  )
  return httpApp
})

/**
 * @since 1.0.0
 * @category http app
 */
export const toHttpAppWebsocket: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
  } | undefined
) => Effect.Effect<
  HttpApp.Default<never, Scope.Scope>,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
  }
) {
  const { httpApp, protocol } = yield* makeProtocolWithHttpAppWebsocket
  yield* make(group, options).pipe(
    Effect.provideService(Protocol, protocol),
    Effect.interruptible,
    Effect.forkScoped
  )
  return httpApp
})

/**
 * Construct an http web handler from an `RpcGroup`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const toWebHandler = <Rpcs extends Rpc.Any, LE>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly layer: Layer.Layer<
      | Rpc.ToHandler<Rpcs>
      | Rpc.Middleware<Rpcs>
      | RpcSerialization.RpcSerialization
      | HttpRouter.HttpRouter.DefaultServices,
      LE
    >
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: HttpApp.Default
    ) => HttpApp.Default<
      never,
      HttpRouter.HttpRouter.DefaultServices
    >
    readonly memoMap?: Layer.MemoMap
  }
): {
  readonly handler: (request: globalThis.Request, context?: Context.Context<never> | undefined) => Promise<Response>
  readonly dispose: () => Promise<void>
} =>
  HttpApp.toWebHandlerLayerWith(Layer.mergeAll(options.layer, Layer.scope), {
    memoMap: options?.memoMap,
    middleware: options?.middleware as any,
    toHandler: (r) => Effect.provide(toHttpApp(group, options), r)
  })

/**
 * Create a protocol that uses the provided `Stream` and `Sink` for communication.
 *
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolStdio = Effect.fnUntraced(function*<EIn, EOut, RIn, ROut>(options: {
  readonly stdin: Stream.Stream<Uint8Array, EIn, RIn>
  readonly stdout: Sink.Sink<void, Uint8Array | string, unknown, EOut, ROut>
}) {
  const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
  const serialization = yield* RpcSerialization.RpcSerialization

  return yield* Protocol.make(Effect.fnUntraced(function*(writeRequest) {
    const mailbox = yield* Mailbox.make<Uint8Array | string>()
    const parser = serialization.unsafeMake()

    yield* options.stdin.pipe(
      Stream.runForEach((data) => {
        const decoded = parser.decode(data) as ReadonlyArray<FromClientEncoded>
        if (decoded.length === 0) return Effect.void
        let i = 0
        return Effect.whileLoop({
          while: () => i < decoded.length,
          body: () => writeRequest(0, decoded[i++]),
          step: constVoid
        })
      }),
      Effect.sandbox,
      Effect.tapError(Effect.logError),
      Effect.retry(Schedule.spaced(500)),
      Effect.ensuring(Fiber.interruptFork(fiber)),
      Effect.forkScoped,
      Effect.interruptible,
      Effect.withUnhandledErrorLogLevel(Option.none())
    )

    yield* Mailbox.toStream(mailbox).pipe(
      Stream.run(options.stdout),
      Effect.retry(Schedule.spaced(500)),
      Effect.forkScoped,
      Effect.interruptible
    )

    return {
      disconnects: yield* Mailbox.make<number>(),
      send(_clientId, response) {
        const responseEncoded = parser.encode(response)
        if (responseEncoded === undefined) {
          return Effect.void
        }
        return mailbox.offer(responseEncoded)
      },
      end(_clientId) {
        return mailbox.end
      },
      clientIds: Effect.succeed(new Set([0])),
      initialMessage: Effect.succeedNone,
      supportsAck: true,
      supportsTransferables: false,
      supportsSpanPropagation: true
    }
  }))
})

/**
 * Create a protocol that uses the provided `Stream` and `Sink` for communication.
 *
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolStdio = <EIn, EOut, RIn, ROut>(options: {
  readonly stdin: Stream.Stream<Uint8Array, EIn, RIn>
  readonly stdout: Sink.Sink<void, Uint8Array | string, unknown, EOut, ROut>
}): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | RIn | ROut> =>
  Layer.scoped(Protocol, makeProtocolStdio(options))

/**
 * Fiber id used for client interruptions.
 *
 * @since 1.0.0
 * @category Interruption
 */
export const fiberIdClientInterrupt = FiberId.make(-499, 0) as FiberId.Runtime

/**
 * Fiber id used for transient interruptions.
 *
 * @since 1.0.0
 * @category Interruption
 */
export const fiberIdTransientInterrupt = FiberId.make(-503, 0) as FiberId.Runtime

// internal

const makeSocketProtocol = Effect.gen(function*() {
  const serialization = yield* RpcSerialization.RpcSerialization
  const disconnects = yield* Mailbox.make<number>()

  let clientId = 0
  const clients = new Map<number, {
    readonly write: (bytes: FromServerEncoded) => Effect.Effect<void>
  }>()
  const clientIds = new Set<number>()

  let writeRequest!: (clientId: number, message: FromClientEncoded) => Effect.Effect<void>

  const onSocket = function*(socket: Socket.Socket, headers?: ReadonlyArray<[string, string]>) {
    const scope = yield* Effect.scope
    const parser = serialization.unsafeMake()
    const id = clientId++
    yield* Scope.addFinalizerExit(scope, () => {
      clientIds.delete(id)
      clients.delete(id)
      return disconnects.offer(id)
    })

    const writeRaw = yield* socket.writer
    const write = (response: FromServerEncoded) => {
      try {
        const encoded = parser.encode(response)
        if (encoded === undefined) {
          return Effect.void
        }
        return Effect.orDie(writeRaw(encoded))
      } catch (cause) {
        return Effect.orDie(
          writeRaw(parser.encode(ResponseDefectEncoded(cause))!)
        )
      }
    }
    clientIds.add(id)
    clients.set(id, { write })

    yield* socket.runRaw((data) => {
      try {
        const decoded = parser.decode(data) as ReadonlyArray<FromClientEncoded>
        if (decoded.length === 0) return Effect.void
        let i = 0
        return Effect.whileLoop({
          while: () => i < decoded.length,
          body() {
            const message = decoded[i++]
            if (message._tag === "Request" && headers) {
              ;(message as Types.Mutable<RequestEncoded>).headers = headers.concat(message.headers)
            }
            return writeRequest(id, message)
          },
          step: constVoid
        })
      } catch (cause) {
        return writeRaw(parser.encode(ResponseDefectEncoded(cause))!)
      }
    }).pipe(
      Effect.interruptible,
      Effect.catchIf((error) => error.reason === "Close", () => Effect.void),
      Effect.orDie,
      Effect.withUnhandledErrorLogLevel(Option.none())
    )
  }

  const protocol = yield* Protocol.make((writeRequest_) => {
    writeRequest = writeRequest_
    return Effect.succeed({
      disconnects,
      send: (clientId, response) => {
        const client = clients.get(clientId)
        if (!client) return Effect.void
        return Effect.orDie(client.write(response))
      },
      end(_clientId) {
        return Effect.void
      },
      clientIds: Effect.sync(() => clientIds),
      initialMessage: Effect.succeedNone,
      supportsAck: true,
      supportsTransferables: false,
      supportsSpanPropagation: true
    })
  })

  return { protocol, onSocket } as const
})
