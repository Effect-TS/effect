/**
 * @since 1.0.0
 */
import * as SocketServer from "@effect/experimental/SocketServer"
import * as Headers from "@effect/platform/Headers"
import * as HttpApp from "@effect/platform/HttpApp"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import type * as Socket from "@effect/platform/Socket"
import * as Transferable from "@effect/platform/Transferable"
import type { WorkerError } from "@effect/platform/WorkerError"
import * as WorkerRunner from "@effect/platform/WorkerRunner"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { constant, constTrue, constVoid, identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import { ArrayFormatter, type ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Rpc from "./Rpc.js"
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
  run(f: (response: FromServer<A>) => Effect.Effect<void>): Effect.Effect<never>
}

/**
 * @since 1.0.0
 * @category server
 */
export const makeNoSerialization: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly disableClientAcks?: boolean | undefined
  } | undefined
) => Effect.Effect<
  RpcServer<Rpcs>,
  never,
  Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Scope.Scope
> = Effect.fnUntraced(
  function*<Rpcs extends Rpc.Any>(
    group: RpcGroup.RpcGroup<Rpcs>,
    options?: {
      readonly disableSpanPropagation?: boolean | undefined
      readonly spanPrefix?: string | undefined
      readonly disableClientAcks?: boolean | undefined
    }
  ) {
    const tracingEnabled = options?.disableSpanPropagation !== true
    const supportsAck = options?.disableClientAcks !== true
    const spanPrefix = options?.spanPrefix ?? "RpcServer"
    const context = yield* Effect.context<Rpc.ToHandler<Rpcs> | Scope.Scope>()
    const scope = Context.get(context, Scope.Scope)
    const runSemaphore = yield* Effect.makeSemaphore(1)
    let writeResponse: (response: FromServer<Rpcs>) => Effect.Effect<void> = () => Effect.void

    type Client = {
      readonly id: number
      readonly latches: Map<RequestId, Effect.Latch>
      readonly fibers: Map<RequestId, Fiber.RuntimeFiber<unknown>>
      ended: boolean
    }

    const clients = new Map<number, Client>()
    yield* Scope.addFinalizer(scope, Effect.sync(() => clients.clear()))

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

    const write = (clientId: number, message: FromClient<Rpcs>): Effect.Effect<void> => {
      let client = clients.get(clientId)
      if (!client) {
        client = {
          id: clientId,
          latches: new Map(),
          fibers: new Map(),
          ended: false
        }
        clients.set(clientId, client)
      }

      switch (message._tag) {
        case "Request": {
          return handleRequest(client, message)
        }
        case "Ack": {
          const latch = client.latches.get(message.requestId)
          return latch ? latch.open : Effect.void
        }
        case "Interrupt": {
          const fiber = client.fibers.get(message.requestId)
          return fiber ? Fiber.interruptFork(fiber) : Effect.void
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
    }

    const endClient = (client: Client) => {
      clients.delete(client.id)
      return writeResponse({
        _tag: "ClientEnd",
        clientId: client.id
      })
    }

    const handleRequest = (client: Client, request: Request<Rpcs>): Effect.Effect<void> => {
      const rpc = group.requests.get(request.tag) as any as Rpc.AnyWithProps
      if (!rpc) {
        const write = writeResponse({
          _tag: "Exit",
          clientId: client.id,
          requestId: request.id,
          exit: Exit.die(`Unknown request tag: ${request.tag}`)
        })
        if (!client.ended || client.fibers.size > 0) return write
        return Effect.zipRight(write, endClient(client))
      }
      const entry = context.unsafeMap.get(rpc.key) as Rpc.Handler<Rpcs["_tag"]>
      const isStream = RpcSchema.isStreamSchema(rpc.successSchema)
      const result = entry.handler(request.payload, request.headers)
      return Effect.exit(applyMiddleware(
        rpc,
        context,
        request.payload,
        request.headers,
        isStream
          ? streamEffect(client, request, result as any)
          : result as Effect.Effect<any>
      )).pipe(
        Effect.flatMap((exit) =>
          writeResponse({
            _tag: "Exit",
            clientId: client.id,
            requestId: request.id,
            exit: exit as any
          })
        ),
        tracingEnabled ?
          Effect.withSpan(`${spanPrefix}.${request.tag}`, {
            parent: {
              _tag: "ExternalSpan",
              traceId: request.traceId,
              spanId: request.spanId,
              sampled: request.sampled,
              context: Context.empty()
            }
          }) :
          identity,
        Effect.locally(FiberRef.currentContext, entry.context),
        Effect.interruptible,
        Effect.forkIn(scope),
        Effect.flatMap((fiber) => {
          client.fibers.set(request.id, fiber)
          fiber.addObserver(() => {
            client.fibers.delete(request.id)
            client.latches.delete(request.id)
            if (client.ended && client.fibers.size === 0) {
              Effect.runFork(endClient(client))
            }
          })
          return Effect.void
        })
      )
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
                if (chunk.length === 0) return Effect.void
                const write = writeResponse({
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
        const write = writeResponse({
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
      Effect.sync(() => {
        const shouldEnd = client.ended && client.fibers.size === 0
        const write = writeResponse({
          _tag: "Defect",
          clientId: client.id,
          defect
        })
        if (!shouldEnd) return write
        return Effect.zipRight(write, endClient(client))
      })

    const run = (f: (response: FromServer<Rpcs>) => Effect.Effect<void>) =>
      runSemaphore.withPermits(1)(Effect.suspend(() => {
        const prevWriteResponse = writeResponse
        writeResponse = f
        return Effect.ensuring(
          Effect.never,
          Effect.sync(() => {
            writeResponse = prevWriteResponse
          })
        )
      }))

    return identity<RpcServer<Rpcs>>({
      write,
      disconnect,
      run
    })
  }
)

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
    const middleware = Context.unsafeGet(context, tag)
    if (tag.optional) {
      const previous = handler
      handler = Effect.matchEffect(middleware(options), {
        onFailure: () => previous,
        onSuccess: tag.provides !== undefined
          ? (value) => Effect.provideService(previous, tag.provides as any, value)
          : (_) => previous
      })
    } else {
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
      readonly disableSpanPropagation?: boolean | undefined
      readonly spanPrefix?: string | undefined
    }
    | undefined
) => Effect.Effect<
  never,
  never,
  Scope.Scope | Protocol | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
  }
) {
  const { disconnects, end, requests, send, supportsAck, supportsTransferables } = yield* Protocol
  const context = yield* Effect.context<Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs>>()

  const server = yield* makeNoSerialization(group, {
    ...options,
    disableClientAcks: !supportsAck
  })

  // handle disconnects
  yield* Effect.fork(Effect.whileLoop({
    while: constTrue,
    body: constant(Effect.flatMap(disconnects.take, (clientId) => {
      clients.delete(clientId)
      return server.disconnect(clientId)
    })),
    step: constVoid
  }))

  type Schemas = {
    readonly decode: (u: unknown) => Effect.Effect<Rpc.Payload<Rpcs>, ParseError>
    readonly encodeChunk: (u: ReadonlyArray<unknown>) => Effect.Effect<ReadonlyArray<unknown>, ParseError>
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
        encodeExit: Schema.encodeUnknown(
          Schema.Exit({
            success: Option.isSome(streamSchemas) ? Schema.Void : rpc.successSchema,
            failure: Schema.Union(...failures),
            defect: Schema.Defect
          })
        ) as any,
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
    Effect.matchEffect(collector ? Effect.provideService(effect, Transferable.Collector, collector) : effect, {
      onSuccess: (a) => send(client.id, onSuccess(a), collector && collector.unsafeClear()),
      onFailure: (error) => {
        client.schemas.delete(requestId)
        return Effect.zipRight(
          server.write(client.id, { _tag: "Interrupt", requestId }),
          sendRequestDefect(client, requestId, ArrayFormatter.formatErrorSync(error))
        )
      }
    })

  // handle responses
  yield* Effect.fork(server.run((response) => {
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
          Effect.locally(schemas.encodeChunk(response.values), FiberRef.currentContext, schemas.context),
          (values) => ({ _tag: "Chunk", requestId: response.requestId, values })
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
          Effect.locally(schemas.encodeExit(response.exit), FiberRef.currentContext, schemas.context),
          (exit) => ({ _tag: "Exit", requestId: response.requestId, exit })
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
  }))

  const sendRequestDefect = (client: Client, requestId: RequestId, defect: unknown) =>
    send(client.id, {
      _tag: "Exit",
      requestId,
      exit: {
        _tag: "Failure",
        cause: {
          _tag: "Die",
          defect
        }
      }
    })

  const sendDefect = (client: Client, defect: unknown) => send(client.id, { _tag: "Defect", defect })

  // main server loop
  return yield* Effect.gen(function*() {
    while (true) {
      const [chunk] = yield* requests.takeAll
      if (chunk.length === 0) break

      for (const [clientId, request] of chunk) {
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
              yield* sendDefect(client, `Unknown request tag: ${tag}`)
              break
            }
            let requestId: RequestId
            switch (typeof request.id) {
              case "bigint":
              case "string": {
                requestId = RequestId(request.id)
                break
              }
              default: {
                yield* sendDefect(client, `Invalid request id: ${request.id}`)
                break
              }
            }
            const schemas = getSchemas(rpc as any)
            yield* Effect.matchEffect(
              Effect.locally(schemas.decode(request.payload), FiberRef.currentContext, schemas.context),
              {
                onFailure: (error) => sendRequestDefect(client, requestId, ArrayFormatter.formatErrorSync(error)),
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
            break
          }
          case "Ping": {
            yield* send(client.id, constPong)
            break
          }
          case "Ack":
          case "Eof":
          case "Interrupt": {
            if ("requestId" in request && typeof request.requestId === "string") {
              ;(request as any).requestId = BigInt(request.requestId)
            }
            yield* server.write(clientId, request)
            break
          }
          default: {
            yield* sendDefect(client, `Unknown request tag: ${(request as any)._tag}`)
            break
          }
        }
      }
    }
    return yield* Effect.never
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.annotateLogs({
      module: "RpcServer"
    })
  )
})

/**
 * @since 1.0.0
 * @category server
 */
export const layer = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
  }
): Layer.Layer<
  never,
  never,
  | Protocol
  | Rpc.ToHandler<Rpcs>
  | Rpc.Middleware<Rpcs>
> => Layer.scopedDiscard(Effect.forkScoped(make(group, options)))

/**
 * @since 1.0.0
 * @category protocol
 */
export class Protocol extends Context.Tag("@effect/rpc/RpcServer/Protocol")<Protocol, {
  readonly requests: Mailbox.ReadonlyMailbox<[clientId: number, data: FromClientEncoded]>
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
}>() {}

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolSocketServer = Effect.gen(function*() {
  const server = yield* SocketServer.SocketServer
  const { onSocket, protocol } = yield* makeSocketProtocol
  yield* Effect.forkScoped(
    server.run(Effect.fnUntraced(onSocket, Effect.scoped))
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
  I | RpcSerialization.RpcSerialization
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
  if (serialization.contentType === "application/json") {
    return yield* Effect.dieMessage(
      "Http protocol does not support JSON serialization. Use RpcSerialization.layerNdjson or RpcSerialization.layerMsgPack instead."
    )
  }

  const requests = yield* Mailbox.make<[number, FromClientEncoded]>()
  const disconnects = yield* Mailbox.make<number>()

  let clientId = 0

  const clients = new Map<number, {
    readonly write: (bytes: FromServerEncoded) => Effect.Effect<void>
    readonly end: Effect.Effect<void>
  }>()

  const httpApp: HttpApp.Default = Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const data = yield* Effect.orDie(request.arrayBuffer)
    const id = clientId++
    const mailbox = yield* Mailbox.make<Uint8Array>()
    const parser = serialization.unsafeMake()
    const encoder = new TextEncoder()

    const offer = (data: Uint8Array | string) =>
      typeof data === "string" ? mailbox.offer(encoder.encode(data)) : mailbox.offer(data)

    clients.set(id, {
      write: (response) => {
        try {
          if (!serialization.supportsBigInt) {
            transformBigInt(response)
          }
          return offer(parser.encode(response))
        } catch (cause) {
          return offer(parser.encode(ResponseDefectEncoded(cause)))
        }
      },
      end: mailbox.end
    })

    const requestIds: Array<RequestId> = []

    try {
      const decoded = parser.decode(new Uint8Array(data)) as ReadonlyArray<FromClientEncoded>
      for (const message of decoded) {
        requests.unsafeOffer([id, message])
        if (message._tag === "Request") {
          requestIds.push(RequestId(message.id))
        }
      }
    } catch (cause) {
      yield* offer(parser.encode(ResponseDefectEncoded(cause)))
    }

    requests.unsafeOffer([id, constEof])

    return HttpServerResponse.stream(
      Mailbox.toStream(mailbox).pipe(
        Stream.ensuringWith((exit) =>
          Effect.sync(() => {
            clients.delete(id)
            disconnects.unsafeOffer(id)
            if (Exit.isInterrupted(exit)) {
              for (const requestId of requestIds) {
                requests.unsafeOffer([id, { _tag: "Interrupt", requestId }])
              }
            }
          })
        )
      ),
      { contentType: serialization.contentType }
    )
  })

  const protocol = Protocol.of({
    requests,
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
    supportsTransferables: false
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
> = Effect.gen(function*() {
  const runner = yield* WorkerRunner.PlatformRunner
  const backing = yield* runner.start<FromClientEncoded | InitialMessage.Encoded, FromServerEncoded>()
  const requests = yield* Mailbox.make<[number, FromClientEncoded]>()
  const initialMessage = yield* Deferred.make<unknown>()

  yield* Effect.forkScoped(backing.run((clientId, message) => {
    if (message._tag === "InitialMessage") {
      return Deferred.succeed(initialMessage, message.value)
    }
    requests.unsafeOffer([clientId, message])
  }))

  return Protocol.of({
    requests,
    disconnects: backing.disconnects ?? (yield* Mailbox.make<number>()),
    send: backing.send,
    end(_clientId) {
      return Effect.void
    },
    initialMessage: Effect.asSome(Deferred.await(initialMessage)),
    supportsAck: true,
    supportsTransferables: true
  })
})

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
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
  } | undefined
) => Effect.Effect<
  HttpApp.Default<never, Scope.Scope>,
  never,
  | Scope.Scope
  | Rpc.ToHandler<Rpcs>
  | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
  }
) {
  const serialization = yield* RpcSerialization.ndjson
  const { httpApp, protocol } = yield* makeProtocolWithHttpApp.pipe(
    Effect.provideService(RpcSerialization.RpcSerialization, serialization)
  )
  yield* make(group, options).pipe(
    Effect.provideService(Protocol, protocol),
    Effect.provideService(RpcSerialization.RpcSerialization, serialization),
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
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
  } | undefined
) => Effect.Effect<
  HttpApp.Default<never, Scope.Scope>,
  never,
  | Scope.Scope
  | Rpc.ToHandler<Rpcs>
  | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableSpanPropagation?: boolean | undefined
    readonly spanPrefix?: string | undefined
  }
) {
  const serialization = yield* RpcSerialization.ndjson
  const { httpApp, protocol } = yield* makeProtocolWithHttpAppWebsocket.pipe(
    Effect.provideService(RpcSerialization.RpcSerialization, serialization)
  )
  yield* make(group, options).pipe(
    Effect.provideService(Protocol, protocol),
    Effect.provideService(RpcSerialization.RpcSerialization, serialization),
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
      Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | HttpRouter.HttpRouter.DefaultServices,
      LE
    >
    readonly disableSpanPropagation?: boolean | undefined
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
  const requests = yield* Mailbox.make<[number, FromClientEncoded]>()
  const disconnects = yield* Mailbox.make<number>()

  let clientId = 0
  const clients = new Map<number, {
    readonly write: (bytes: FromServerEncoded) => Effect.Effect<void>
  }>()

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
        if (!serialization.supportsBigInt) {
          transformBigInt(response)
        }
        return Effect.orDie(writeRaw(parser.encode(response)))
      } catch (cause) {
        return Effect.orDie(
          writeRaw(parser.encode(ResponseDefectEncoded(cause)))
        )
      }
    }
    clients.set(clientId, { write })

    yield* Effect.orDie(socket.runRaw((data) => {
      try {
        const decoded = parser.decode(data) as ReadonlyArray<FromClientEncoded>
        for (let i = 0; i < decoded.length; i++) {
          requests.unsafeOffer([clientId, decoded[i]])
        }
      } catch (cause) {
        return writeRaw(parser.encode(ResponseDefectEncoded(cause)))
      }
    }))
  }

  const protocol = Protocol.of({
    requests,
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
    supportsTransferables: false
  })

  return { protocol, onSocket } as const
})

const transformBigInt = (response: FromServerEncoded) => {
  if ("requestId" in response) {
    ;(response as any).requestId = response.requestId.toString()
  }
}
