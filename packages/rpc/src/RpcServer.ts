/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as HttpApp from "@effect/platform/HttpApp"
import * as HttpRouter from "@effect/platform/HttpRouter"
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
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import { type ParseError, TreeFormatter } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Runtime from "effect/Runtime"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import { withRun } from "./internal/utils.js"
import * as Rpc from "./Rpc.js"
import type * as RpcGroup from "./RpcGroup.js"
import {
  constEof,
  constPong,
  type FromClient,
  type FromClientEncoded,
  type FromServer,
  type FromServerEncoded,
  type Request,
  RequestId,
  ResponseDefectEncoded
} from "./RpcMessage.js"
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
    readonly disableClientAcks?: boolean | undefined
    readonly concurrency?: number | "unbounded" | undefined
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
    readonly disableClientAcks?: boolean | undefined
    readonly concurrency?: number | "unbounded" | undefined
  }
) {
  const enableTracing = options.disableTracing !== true
  const enableSpanPropagation = options.disableSpanPropagation !== true
  const supportsAck = options.disableClientAcks !== true
  const spanPrefix = options.spanPrefix ?? "RpcServer"
  const concurrency = options.concurrency ?? "unbounded"
  const context = yield* Effect.context<Rpc.ToHandler<Rpcs> | Scope.Scope>()
  const scope = Context.get(context, Scope.Scope)
  const fiberSet = yield* FiberSet.make()
  const runFork = yield* FiberSet.runtime(fiberSet)().pipe(
    Effect.interruptible
  )
  const concurrencySemaphore = concurrency === "unbounded"
    ? undefined
    : yield* Effect.makeSemaphore(concurrency)

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
    Effect.fiberIdWith((fiberId) => {
      isShutdown = true
      for (const client of clients.values()) {
        client.ended = true
        if (client.fibers.size === 0) {
          runFork(endClient(client))
          continue
        }
        for (const fiber of client.fibers.values()) {
          fiber.unsafeInterruptAsFork(fiberId)
        }
      }
      if (clients.size === 0) {
        return Effect.void
      }
      return shutdownLatch.await
    })
  )

  const disconnect = (clientId: number) =>
    Effect.fiberIdWith((fiberId) => {
      const client = clients.get(clientId)
      if (!client) return Effect.void
      for (const fiber of client.fibers.values()) {
        fiber.unsafeInterruptAsFork(fiberId)
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
            return fiber ? Fiber.interruptFork(fiber) : options.onFromServer({
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
      return Effect.interrupt
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
    const result = entry.handler(request.payload, request.headers)

    // if the handler requested forking, then we skip the concurrency control
    const isFork = Rpc.isFork(result)
    // unwrap the fork data type
    const streamOrEffect = isFork ? result.value : result

    let responded = false
    let effect = Effect.uninterruptible(Effect.matchCauseEffect(
      Effect.interruptible(applyMiddleware(
        rpc,
        context,
        request.payload,
        request.headers,
        isStream
          ? streamEffect(client, request, streamOrEffect)
          : streamOrEffect as Effect.Effect<any>
      )),
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
          return options.onFromServer({
            _tag: "Exit",
            clientId: client.id,
            requestId: request.id,
            exit: Exit.failCause(cause)
          })
        }
      }
    ))
    if (enableTracing) {
      const parentSpan = requestFiber.currentContext.unsafeMap.get(Tracer.ParentSpan.key) as Tracer.AnySpan | undefined
      effect = Effect.withSpan(effect, `${spanPrefix}.${request.tag}`, {
        captureStackTrace: false,
        parent: enableSpanPropagation ?
          {
            _tag: "ExternalSpan",
            traceId: request.traceId,
            spanId: request.spanId,
            sampled: request.sampled,
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
      effect = concurrencySemaphore.withPermits(1)(effect)
    }
    const runtime = Runtime.make({
      context: Context.merge(entry.context, requestFiber.currentContext),
      fiberRefs: requestFiber.getFiberRefs(),
      runtimeFlags: Runtime.defaultRuntime.runtimeFlags
    })
    const fiber = Runtime.runFork(runtime, effect)
    FiberSet.unsafeAdd(fiberSet, fiber)
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
    headers
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
      readonly concurrency?: number | "unbounded" | undefined
    }
    | undefined
) => Effect.Effect<
  never,
  never,
  Protocol | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly concurrency?: number | "unbounded" | undefined
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
      const failures = new Set([rpc.errorSchema])
      if (Option.isSome(streamSchemas)) {
        failures.add(streamSchemas.value.failure)
      }
      for (const middleware of rpc.middlewares) {
        failures.add(middleware.failure)
      }
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
          server.write(client.id, { _tag: "Interrupt", requestId, interruptors: [] }),
          sendRequestDefect(client, requestId, defect)
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
    Effect.onExit((exit) => Scope.close(scope, exit))
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
    readonly concurrency?: number | "unbounded" | undefined
  }
): Layer.Layer<
  never,
  never,
  | Protocol
  | Rpc.ToHandler<Rpcs>
  | Rpc.Middleware<Rpcs>
> => Layer.scopedDiscard(Effect.forkScoped(Effect.interruptible(make(group, options))))

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
  yield* Effect.forkScoped(Effect.interruptible(
    server.run(Effect.fnUntraced(onSocket, Effect.scoped))
  ))
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
    yield* onSocket(socket)
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
  const isJson = serialization.contentType === "application/json"

  const disconnects = yield* Mailbox.make<number>()
  let writeRequest!: (clientId: number, message: FromClientEncoded) => Effect.Effect<void>

  let clientId = 0

  const clients = new Map<number, {
    readonly write: (bytes: FromServerEncoded) => Effect.Effect<void>
    readonly end: Effect.Effect<void>
  }>()

  const httpApp: HttpApp.Default<never, Scope.Scope> = Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const data = yield* Effect.orDie(request.arrayBuffer)
    const id = clientId++
    const mailbox = yield* Mailbox.make<Uint8Array | FromServerEncoded>()
    const parser = serialization.unsafeMake()
    const encoder = new TextEncoder()

    const offer = (data: Uint8Array | string) =>
      typeof data === "string" ? mailbox.offer(encoder.encode(data)) : mailbox.offer(data)

    clients.set(id, {
      write: (response) => {
        try {
          return isJson ? mailbox.offer(response) : offer(parser.encode(response))
        } catch (cause) {
          return isJson
            ? mailbox.offer(ResponseDefectEncoded(cause))
            : offer(parser.encode(ResponseDefectEncoded(cause)))
        }
      },
      end: mailbox.end
    })

    const requestIds: Array<RequestId> = []

    try {
      const decoded = parser.decode(new Uint8Array(data)) as ReadonlyArray<FromClientEncoded>
      for (const message of decoded) {
        if (message._tag === "Request") {
          requestIds.push(RequestId(message.id))
        }
        yield* writeRequest(id, message)
      }
    } catch (cause) {
      yield* offer(parser.encode(ResponseDefectEncoded(cause)))
    }

    yield* writeRequest(id, constEof)

    if (isJson) {
      let done = false
      yield* Effect.addFinalizer(() => {
        clients.delete(id)
        disconnects.unsafeOffer(id)
        if (done) return Effect.void
        return Effect.forEach(
          requestIds,
          (requestId) => writeRequest(id, { _tag: "Interrupt", requestId: String(requestId) }),
          { discard: true }
        )
      })
      const responses = Arr.empty<FromServerEncoded>()
      while (true) {
        const [items, done] = yield* mailbox.takeAll
        // eslint-disable-next-line no-restricted-syntax
        responses.push(...items as any)
        if (done) break
      }
      done = true
      return HttpServerResponse.unsafeJson(responses)
    }

    return HttpServerResponse.stream(
      Stream.ensuringWith(Mailbox.toStream(mailbox as Mailbox.ReadonlyMailbox<Uint8Array>), (exit) => {
        clients.delete(id)
        disconnects.unsafeOffer(id)
        if (!Exit.isInterrupted(exit)) return Effect.void
        return Effect.forEach(
          requestIds,
          (requestId) => writeRequest(id, { _tag: "Interrupt", requestId: String(requestId) }),
          { discard: true }
        )
      }),
      { contentType: serialization.contentType }
    )
  }).pipe(Effect.interruptible)

  const protocol = yield* Protocol.make((writeRequest_) => {
    writeRequest = writeRequest_
    return Effect.succeed({
      disconnects,
      send: (clientId, response) => {
        const client = clients.get(clientId)
        if (!client) return Effect.void
        return client.write(response)
      },
      end(clientId) {
        const client = clients.get(clientId)
        if (!client) return Effect.void
        return client.end
      },
      initialMessage: Effect.succeedNone,
      supportsAck: false,
      supportsTransferables: false,
      supportsSpanPropagation: false
    })
  })

  return { protocol, httpApp } as const
})

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

  yield* Deferred.await(closeLatch).pipe(
    Effect.onExit(() => {
      fiber.currentScheduler.scheduleTask(() => fiber.unsafeInterruptAsFork(fiber.id()), 0)
      return Effect.void
    }),
    Effect.forkScoped
  )

  yield* backing.run((clientId, message) => {
    if (message._tag === "InitialMessage") {
      return Deferred.succeed(initialMessage, message.value)
    }
    return writeRequest(clientId, message)
  })

  return {
    disconnects: backing.disconnects ?? (yield* Mailbox.make<number>()),
    send: backing.send,
    end(_clientId) {
      return Effect.void
    },
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
 * @since 1.0.0
 * @category http app
 */
export const toHttpApp: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
  } | undefined
) => Effect.Effect<
  HttpApp.Default<never, Scope.Scope>,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
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
  } | undefined
) => Effect.Effect<
  HttpApp.Default<never, Scope.Scope>,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
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
} => {
  const runtime = ManagedRuntime.make(Layer.mergeAll(options.layer, Layer.scope), options?.memoMap)
  let handlerCached:
    | ((request: globalThis.Request, context?: Context.Context<never> | undefined) => Promise<Response>)
    | undefined
  const handlerPromise = Effect.gen(function*() {
    const app = yield* toHttpApp(group, options)
    const rt = yield* runtime.runtimeEffect
    const handler = HttpApp.toWebHandlerRuntime(rt)(options?.middleware ? options.middleware(app as any) as any : app)
    handlerCached = handler
    return handler
  }).pipe(runtime.runPromise)
  function handler(request: globalThis.Request, context?: Context.Context<never> | undefined): Promise<Response> {
    if (handlerCached !== undefined) {
      return handlerCached(request, context)
    }
    return handlerPromise.then((handler) => handler(request, context))
  }
  return { handler, dispose: runtime.dispose } as const
}

// internal

const makeSocketProtocol = Effect.gen(function*() {
  const serialization = yield* RpcSerialization.RpcSerialization
  const disconnects = yield* Mailbox.make<number>()

  let clientId = 0
  const clients = new Map<number, {
    readonly write: (bytes: FromServerEncoded) => Effect.Effect<void>
  }>()

  let writeRequest!: (clientId: number, message: FromClientEncoded) => Effect.Effect<void>

  const onSocket = function*(socket: Socket.Socket) {
    const scope = yield* Effect.scope
    const parser = serialization.unsafeMake()
    const id = clientId++
    yield* Scope.addFinalizerExit(scope, () => {
      clients.delete(id)
      return disconnects.offer(id)
    })

    const writeRaw = yield* socket.writer
    const write = (response: FromServerEncoded) => {
      try {
        return Effect.orDie(writeRaw(parser.encode(response)))
      } catch (cause) {
        return Effect.orDie(
          writeRaw(parser.encode(ResponseDefectEncoded(cause)))
        )
      }
    }
    clients.set(id, { write })

    yield* socket.runRaw((data) => {
      try {
        const decoded = parser.decode(data) as ReadonlyArray<FromClientEncoded>
        if (decoded.length === 0) return Effect.void
        let i = 0
        return Effect.whileLoop({
          while: () => i < decoded.length,
          body: () => writeRequest(id, decoded[i++]),
          step: constVoid
        })
      } catch (cause) {
        return writeRaw(parser.encode(ResponseDefectEncoded(cause)))
      }
    }).pipe(
      Effect.interruptible,
      Effect.catchIf((error) => error.reason === "Close", () => Effect.void),
      Effect.orDie
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
      initialMessage: Effect.succeedNone,
      supportsAck: true,
      supportsTransferables: false,
      supportsSpanPropagation: true
    })
  })

  return { protocol, onSocket } as const
})
