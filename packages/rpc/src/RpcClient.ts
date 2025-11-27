/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Socket from "@effect/platform/Socket"
import * as Transferable from "@effect/platform/Transferable"
import * as Worker from "@effect/platform/Worker"
import type { WorkerError } from "@effect/platform/WorkerError"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import { constVoid, dual, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import * as Pool from "effect/Pool"
import * as Runtime from "effect/Runtime"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Mutable } from "effect/Types"
import { withRun } from "./internal/utils.js"
import * as Rpc from "./Rpc.js"
import { RpcClientError } from "./RpcClientError.js"
import type * as RpcGroup from "./RpcGroup.js"
import type { FromClient, FromClientEncoded, FromServer, FromServerEncoded, Request } from "./RpcMessage.js"
import { constPing, RequestId } from "./RpcMessage.js"
import type * as RpcMiddleware from "./RpcMiddleware.js"
import * as RpcSchema from "./RpcSchema.js"
import * as RpcSerialization from "./RpcSerialization.js"
import * as RpcWorker from "./RpcWorker.js"

/**
 * @since 1.0.0
 * @category client
 */
export type RpcClient<Rpcs extends Rpc.Any, E = never> = Schema.Simplify<
  & RpcClient.From<RpcClient.NonPrefixed<Rpcs>, E, "">
  & {
    readonly [CurrentPrefix in RpcClient.Prefixes<Rpcs>]: RpcClient.From<
      RpcClient.Prefixed<Rpcs, CurrentPrefix>,
      E,
      CurrentPrefix
    >
  }
>

/**
 * @since 1.0.0
 * @category client
 */
export declare namespace RpcClient {
  /**
   * @since 1.0.0
   * @category client
   */
  export type Prefixes<Rpcs extends Rpc.Any> = Rpcs["_tag"] extends infer Tag
    ? Tag extends `${infer Prefix}.${string}` ? Prefix : never
    : never

  /**
   * @since 1.0.0
   * @category client
   */
  export type NonPrefixed<Rpcs extends Rpc.Any> = Exclude<Rpcs, { readonly _tag: `${string}.${string}` }>

  /**
   * @since 1.0.0
   * @category client
   */
  export type Prefixed<Rpcs extends Rpc.Any, Prefix extends string> = Extract<
    Rpcs,
    { readonly _tag: `${Prefix}.${string}` }
  >

  /**
   * @since 1.0.0
   * @category client
   */
  export type From<Rpcs extends Rpc.Any, E = never, Prefix extends string = ""> = {
    readonly [
      Current in Rpcs as Current["_tag"] extends `${Prefix}.${infer Method}` ? Method
        : Current["_tag"]
    ]: <
      const AsMailbox extends boolean = false,
      const Discard = false
    >(
      input: Rpc.PayloadConstructor<Current>,
      options?: [Rpc.SuccessSchema<Current>] extends [RpcSchema.Stream<infer _A, infer _E>] ? {
          readonly asMailbox?: AsMailbox | undefined
          readonly streamBufferSize?: number | undefined
          readonly headers?: Headers.Input | undefined
          readonly context?: Context.Context<never> | undefined
        } :
        {
          readonly headers?: Headers.Input | undefined
          readonly context?: Context.Context<never> | undefined
          readonly discard?: Discard | undefined
        }
    ) => Current extends Rpc.Rpc<
      infer _Tag,
      infer _Payload,
      infer _Success,
      infer _Error,
      infer _Middleware
    > ? [_Success] extends [RpcSchema.Stream<infer _A, infer _E>] ? AsMailbox extends true ? Effect.Effect<
            Mailbox.ReadonlyMailbox<_A["Type"], _E["Type"] | _Error["Type"] | E | _Middleware["failure"]["Type"]>,
            never,
            | Scope.Scope
            | _Payload["Context"]
            | _Success["Context"]
            | _Error["Context"]
            | _Middleware["failure"]["Context"]
          >
        : Stream.Stream<
          _A["Type"],
          _E["Type"] | _Error["Type"] | E | _Middleware["failure"]["Type"],
          _Payload["Context"] | _Success["Context"] | _Error["Context"] | _Middleware["failure"]["Context"]
        >
      : Effect.Effect<
        Discard extends true ? void : _Success["Type"],
        Discard extends true ? E : _Error["Type"] | E | _Middleware["failure"]["Type"],
        _Payload["Context"] | _Success["Context"] | _Error["Context"] | _Middleware["failure"]["Context"]
      > :
      never
  }

  /**
   * @since 1.0.0
   * @category client
   */
  export type Flat<Rpcs extends Rpc.Any, E = never> = <
    const Tag extends Rpcs["_tag"],
    const AsMailbox extends boolean = false,
    const Discard = false
  >(
    tag: Tag,
    payload: Rpc.PayloadConstructor<Rpc.ExtractTag<Rpcs, Tag>>,
    options?: Rpc.Success<Rpc.ExtractTag<Rpcs, Tag>> extends Stream.Stream<infer _A, infer _E, infer _R> ? {
        readonly asMailbox?: AsMailbox | undefined
        readonly streamBufferSize?: number | undefined
        readonly headers?: Headers.Input | undefined
        readonly context?: Context.Context<never> | undefined
      } :
      {
        readonly headers?: Headers.Input | undefined
        readonly context?: Context.Context<never> | undefined
        readonly discard?: Discard | undefined
      }
  ) => Rpc.ExtractTag<Rpcs, Tag> extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? [_Success] extends [RpcSchema.Stream<infer _A, infer _E>] ? AsMailbox extends true ? Effect.Effect<
          Mailbox.ReadonlyMailbox<_A["Type"], _E["Type"] | _Error["Type"] | E | _Middleware["failure"]["Type"]>,
          never,
          | Scope.Scope
          | _Payload["Context"]
          | _Success["Context"]
          | _Error["Context"]
          | _Middleware["failure"]["Context"]
        >
      : Stream.Stream<
        _A["Type"],
        _E["Type"] | _Error["Type"] | E | _Middleware["failure"]["Type"],
        _Payload["Context"] | _Success["Context"] | _Error["Context"] | _Middleware["failure"]["Context"]
      >
    : Effect.Effect<
      Discard extends true ? void : _Success["Type"],
      Discard extends true ? E : _Error["Type"] | E | _Middleware["failure"]["Type"],
      _Payload["Context"] | _Success["Context"] | _Error["Context"] | _Middleware["failure"]["Context"]
    > :
    never
}

/**
 * @since 1.0.0
 * @category client
 */
export type FromGroup<Group, E = never> = RpcClient<RpcGroup.Rpcs<Group>, E>

let requestIdCounter = BigInt(0)

/**
 * @since 1.0.0
 * @category client
 */
export const makeNoSerialization: <Rpcs extends Rpc.Any, E, const Flatten extends boolean = false>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly onFromClient: (
      options: {
        readonly message: FromClient<Rpcs>
        readonly context: Context.Context<never>
        readonly discard: boolean
      }
    ) => Effect.Effect<void, E>
    readonly supportsAck?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly generateRequestId?: (() => RequestId) | undefined
    readonly disableTracing?: boolean | undefined
    readonly flatten?: Flatten | undefined
  }
) => Effect.Effect<
  {
    readonly client: Flatten extends true ? RpcClient.Flat<Rpcs, E> : RpcClient<Rpcs, E>
    readonly write: (message: FromServer<Rpcs>) => Effect.Effect<void>
  },
  never,
  Scope.Scope | Rpc.MiddlewareClient<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any, E, const Flatten extends boolean = false>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly onFromClient: (
      options: {
        readonly message: FromClient<Rpcs>
        readonly context: Context.Context<never>
        readonly discard: boolean
      }
    ) => Effect.Effect<void, E>
    readonly supportsAck?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly generateRequestId?: (() => RequestId) | undefined
    readonly disableTracing?: boolean | undefined
    readonly flatten?: Flatten | undefined
  }
) {
  const spanPrefix = options?.spanPrefix ?? "RpcClient"
  const supportsAck = options?.supportsAck ?? true
  const disableTracing = options?.disableTracing ?? false
  const generateRequestId = options?.generateRequestId ?? (() => requestIdCounter++ as RequestId)

  const context = yield* Effect.context<Rpc.MiddlewareClient<Rpcs> | Scope.Scope>()
  const scope = Context.get(context, Scope.Scope)

  type ClientEntry = {
    readonly _tag: "Effect"
    readonly rpc: Rpc.AnyWithProps
    readonly context: Context.Context<never>
    resume: (_: Exit.Exit<any, any>) => void
  } | {
    readonly _tag: "Mailbox"
    readonly rpc: Rpc.AnyWithProps
    readonly mailbox: Mailbox.Mailbox<any, any>
    readonly scope: Scope.Scope
    readonly context: Context.Context<never>
  }
  const entries = new Map<RequestId, ClientEntry>()

  let isShutdown = false
  yield* Scope.addFinalizer(
    scope,
    Effect.suspend(() => {
      isShutdown = true
      return clearEntries(Exit.interrupt(fiberIdTransientInterrupt))
    })
  )

  const clearEntries = Effect.fnUntraced(function*(exit: Exit.Exit<never>) {
    for (const [id, entry] of entries) {
      entries.delete(id)
      if (entry._tag === "Mailbox") {
        yield* entry.mailbox.done(exit)
      } else {
        entry.resume(exit)
      }
    }
  })

  const onRequest = (rpc: Rpc.AnyWithProps) => {
    const isStream = RpcSchema.isStreamSchema(rpc.successSchema)
    const middleware = getRpcClientMiddleware(rpc)
    return (payload: any, opts?: {
      readonly asMailbox?: boolean | undefined
      readonly streamBufferSize?: number | undefined
      readonly headers?: Headers.Input | undefined
      readonly context?: Context.Context<never> | undefined
      readonly discard?: boolean | undefined
    }) => {
      const headers = opts?.headers ? Headers.fromInput(opts.headers) : Headers.empty
      const context = opts?.context ?? Context.empty()
      if (!isStream) {
        const onRequest = (span: Span | undefined) =>
          onEffectRequest(
            rpc,
            middleware,
            span,
            rpc.payloadSchema.make ? rpc.payloadSchema.make(payload) : payload,
            headers,
            context,
            opts?.discard ?? false
          )
        return disableTracing ? onRequest(undefined) : Effect.useSpan(
          `${spanPrefix}.${rpc._tag}`,
          { captureStackTrace: false, attributes: options.spanAttributes },
          onRequest
        )
      }
      const mailbox = onStreamRequest(
        rpc,
        middleware,
        rpc.payloadSchema.make ? rpc.payloadSchema.make(payload) : payload,
        headers,
        opts?.streamBufferSize ?? 16,
        context
      )
      if (opts?.asMailbox) return mailbox
      return Stream.unwrapScoped(Effect.map(mailbox, Mailbox.toStream))
    }
  }

  const onEffectRequest = (
    rpc: Rpc.AnyWithProps,
    middleware: (request: Request<Rpcs>) => Effect.Effect<Request<Rpcs>>,
    span: Span | undefined,
    payload: any,
    headers: Headers.Headers,
    context: Context.Context<never>,
    discard: boolean
  ) =>
    Effect.withFiberRuntime<any, any, any>((parentFiber) => {
      if (isShutdown) {
        return Effect.interrupt
      }
      const id = generateRequestId()
      const send = middleware({
        _tag: "Request",
        id,
        tag: rpc._tag as Rpc.Tag<Rpcs>,
        payload,
        traceId: span?.traceId,
        spanId: span?.spanId,
        sampled: span?.sampled,
        headers: Headers.merge(parentFiber.getFiberRef(currentHeaders), headers)
      })
      if (discard) {
        return Effect.flatMap(send, (message) =>
          options.onFromClient({
            message,
            context,
            discard
          }))
      }
      const runtime = Runtime.make({
        context: parentFiber.currentContext,
        fiberRefs: parentFiber.getFiberRefs(),
        runtimeFlags: Runtime.defaultRuntime.runtimeFlags
      })
      let fiber: Fiber.RuntimeFiber<any, any>
      let completed = false
      return Effect.onInterrupt(
        Effect.async<any, any>((resume) => {
          const entry: ClientEntry = {
            _tag: "Effect",
            rpc,
            context,
            resume(exit) {
              completed = true
              resume(exit)
              if (fiber && !fiber.unsafePoll()) {
                parentFiber.currentScheduler.scheduleTask(() => {
                  fiber.unsafeInterruptAsFork(parentFiber.id())
                }, 0)
              }
            }
          }
          entries.set(id, entry)
          fiber = send.pipe(
            Effect.flatMap((request) =>
              options.onFromClient({
                message: request,
                context,
                discard
              })
            ),
            span ? Effect.withParentSpan(span) : identity,
            Runtime.runFork(runtime)
          )
          fiber.addObserver((exit) => {
            if (exit._tag === "Failure") {
              return resume(exit)
            }
          })
        }),
        (interruptors) => {
          if (completed) return Effect.void
          entries.delete(id)
          const ids = Array.from(interruptors).flatMap((id) => Array.from(FiberId.toSet(id)))
          return Effect.zipRight(
            Fiber.interrupt(fiber),
            sendInterrupt(id, ids, context)
          )
        }
      )
    })

  const onStreamRequest = Effect.fnUntraced(function*(
    rpc: Rpc.AnyWithProps,
    middleware: (request: Request<Rpcs>) => Effect.Effect<Request<Rpcs>>,
    payload: any,
    headers: Headers.Headers,
    streamBufferSize: number,
    context: Context.Context<never>
  ) {
    if (isShutdown) {
      return yield* Effect.interrupt
    }

    const span = disableTracing ? undefined : yield* Effect.makeSpanScoped(`${spanPrefix}.${rpc._tag}`, {
      captureStackTrace: false,
      attributes: options.spanAttributes
    })
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
    const id = generateRequestId()

    const scope = Context.unsafeGet(fiber.currentContext, Scope.Scope)
    yield* Scope.addFinalizerExit(
      scope,
      (exit) => {
        if (!entries.has(id)) return Effect.void
        entries.delete(id)
        return sendInterrupt(
          id,
          Exit.isFailure(exit)
            ? Array.from(Cause.interruptors(exit.cause)).flatMap((id) => Array.from(FiberId.toSet(id)))
            : [],
          context
        )
      }
    )

    const mailbox = yield* Mailbox.make<any, any>(streamBufferSize)
    entries.set(id, {
      _tag: "Mailbox",
      rpc,
      mailbox,
      scope,
      context
    })

    yield* middleware({
      _tag: "Request",
      id,
      tag: rpc._tag as Rpc.Tag<Rpcs>,
      traceId: span?.traceId,
      payload,
      spanId: span?.spanId,
      sampled: span?.sampled,
      headers: Headers.merge(fiber.getFiberRef(currentHeaders), headers)
    }).pipe(
      Effect.flatMap(
        (request) =>
          options.onFromClient({
            message: request,
            context,
            discard: false
          })
      ),
      span ? Effect.withParentSpan(span) : identity,
      Effect.catchAllCause((error) => mailbox.failCause(error)),
      Effect.interruptible,
      Effect.forkIn(scope)
    )

    return mailbox
  })

  const getRpcClientMiddleware = (rpc: Rpc.AnyWithProps): (request: Request<Rpcs>) => Effect.Effect<Request<Rpcs>> => {
    const middlewares: Array<RpcMiddleware.RpcMiddlewareClient> = []
    for (const tag of rpc.middlewares.values()) {
      const middleware = context.unsafeMap.get(`${tag.key}/Client`)
      if (!middleware) continue
      middlewares.push(middleware)
    }
    return middlewares.length === 0
      ? Effect.succeed
      : function(request) {
        let i = 0
        return Effect.map(
          Effect.whileLoop({
            while: () => i < middlewares.length,
            body: () =>
              middlewares[i]({
                rpc,
                request
              }) as Effect.Effect<Request<Rpcs>>,
            step(nextRequest) {
              request = nextRequest
              i++
            }
          }),
          () => request
        )
      }
  }

  const sendInterrupt = (
    requestId: RequestId,
    interruptors: ReadonlyArray<FiberId.FiberId>,
    context: Context.Context<never>
  ): Effect.Effect<void> =>
    Effect.async<void>((resume) => {
      const parentFiber = Option.getOrThrow(Fiber.getCurrentFiber())
      const runtime = Runtime.make({
        context: parentFiber.currentContext,
        fiberRefs: parentFiber.getFiberRefs(),
        runtimeFlags: Runtime.defaultRuntime.runtimeFlags
      })
      const fiber = options.onFromClient({
        message: { _tag: "Interrupt", requestId, interruptors },
        context,
        discard: false
      }).pipe(
        Effect.timeout(1000),
        Runtime.runFork(runtime)
      )
      fiber.addObserver(() => {
        resume(Effect.void)
      })
    })

  const write = (message: FromServer<Rpcs>): Effect.Effect<void> => {
    switch (message._tag) {
      case "Chunk": {
        const requestId = message.requestId
        const entry = entries.get(requestId)
        if (!entry || entry._tag !== "Mailbox") return Effect.void
        return entry.mailbox.offerAll(message.values).pipe(
          supportsAck
            ? Effect.zipRight(
              options.onFromClient({
                message: { _tag: "Ack", requestId: message.requestId },
                context: entry.context,
                discard: false
              })
            )
            : identity,
          Effect.catchAllCause((cause) => entry.mailbox.done(Exit.failCause(cause)))
        )
      }
      case "Exit": {
        const requestId = message.requestId
        const entry = entries.get(requestId)
        if (!entry) return Effect.void
        entries.delete(requestId)
        if (entry._tag === "Effect") {
          entry.resume(message.exit)
          return Effect.void
        }
        return entry.mailbox.done(Exit.asVoid(message.exit))
      }
      case "Defect": {
        return clearEntries(Exit.die(message.defect))
      }
      case "ClientEnd": {
        return Effect.void
      }
    }
  }

  let client: any
  if (options.flatten) {
    const fns = new Map<string, any>()
    client = function client(tag: string, payload: any, options?: {}) {
      let fn = fns.get(tag)
      if (!fn) {
        fn = onRequest(group.requests.get(tag)! as any)
        fns.set(tag, fn)
      }
      return fn(payload, options)
    }
  } else {
    client = {}
    for (const rpc of group.requests.values()) {
      const dot = rpc._tag.indexOf(".")
      const prefix = dot === -1 ? undefined : rpc._tag.slice(0, dot)
      if (prefix !== undefined && !(prefix in client)) {
        ;(client as any)[prefix] = {} as Mutable<RpcClient.Prefixed<Rpcs, typeof prefix>>
      }
      const target = prefix !== undefined ? (client as any)[prefix] : client
      const tag = prefix !== undefined ? rpc._tag.slice(dot + 1) : rpc._tag
      target[tag] = onRequest(rpc as any)
    }
  }

  return { client, write } as const
})

const fiberIdTransientInterrupt = FiberId.make(-503, 0) as FiberId.Runtime

/**
 * @since 1.0.0
 * @category client
 */
export const make: <Rpcs extends Rpc.Any, const Flatten extends boolean = false>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly generateRequestId?: (() => RequestId) | undefined
    readonly disableTracing?: boolean | undefined
    readonly flatten?: Flatten | undefined
  } | undefined
) => Effect.Effect<
  Flatten extends true ? RpcClient.Flat<Rpcs, RpcClientError> : RpcClient<Rpcs, RpcClientError>,
  never,
  Protocol | Rpc.MiddlewareClient<Rpcs> | Scope.Scope
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any, const Flatten extends boolean = false>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly generateRequestId?: (() => RequestId) | undefined
    readonly disableTracing?: boolean | undefined
    readonly flatten?: Flatten | undefined
  } | undefined
) {
  const { run, send, supportsAck, supportsTransferables } = yield* Protocol

  type ClientEntry = {
    readonly rpc: Rpc.AnyWithProps
    readonly context: Context.Context<never>
    readonly decodeChunk:
      | ((chunk: ReadonlyArray<unknown>) => Effect.Effect<NonEmptyReadonlyArray<any>, ParseError, unknown>)
      | undefined
  }
  const entries = new Map<RequestId, ClientEntry>()

  const { client, write } = yield* makeNoSerialization(group, {
    ...options,
    supportsAck,
    onFromClient({ message }) {
      switch (message._tag) {
        case "Request": {
          const rpc = group.requests.get(message.tag)! as any as Rpc.AnyWithProps
          const schemas = RpcSchema.getStreamSchemas(rpc.successSchema.ast)
          const collector = supportsTransferables ? Transferable.unsafeMakeCollector() : undefined

          const fiber = Option.getOrThrow(Fiber.getCurrentFiber())

          const entry: ClientEntry = {
            rpc,
            context: collector
              ? Context.add(fiber.currentContext, Transferable.Collector, collector)
              : fiber.currentContext,
            decodeChunk: Option.isSome(schemas)
              ? Schema.decodeUnknown(Schema.NonEmptyArray(schemas.value.success))
              : undefined
          }
          entries.set(message.id, entry)

          return Schema.encode(rpc.payloadSchema)(message.payload).pipe(
            Effect.locally(FiberRef.currentContext, entry.context),
            Effect.orDie,
            Effect.flatMap((payload) =>
              send({
                ...message,
                id: String(message.id),
                payload,
                headers: Object.entries(message.headers)
              }, collector && collector.unsafeClear())
            )
          ) as Effect.Effect<void, RpcClientError>
        }
        case "Ack": {
          const entry = entries.get(message.requestId)
          if (!entry) return Effect.void
          return send({
            _tag: "Ack",
            requestId: String(message.requestId)
          }) as Effect.Effect<void, RpcClientError>
        }
        case "Interrupt": {
          const entry = entries.get(message.requestId)
          if (!entry) return Effect.void
          entries.delete(message.requestId)
          return send({
            _tag: "Interrupt",
            requestId: String(message.requestId)
          }) as Effect.Effect<void, RpcClientError>
        }
        case "Eof": {
          return Effect.void
        }
      }
    }
  })

  yield* run((message) => {
    switch (message._tag) {
      case "Chunk": {
        const requestId = RequestId(message.requestId)
        const entry = entries.get(requestId)
        if (!entry || !entry.decodeChunk) return Effect.void
        return entry.decodeChunk(message.values).pipe(
          Effect.locally(FiberRef.currentContext, entry.context),
          Effect.orDie,
          Effect.flatMap((chunk) =>
            write({ _tag: "Chunk", clientId: 0, requestId: RequestId(message.requestId), values: chunk })
          ),
          Effect.onError((cause) =>
            write({
              _tag: "Exit",
              clientId: 0,
              requestId: RequestId(message.requestId),
              exit: Exit.failCause(cause)
            })
          )
        ) as Effect.Effect<void>
      }
      case "Exit": {
        const requestId = RequestId(message.requestId)
        const entry = entries.get(requestId)
        if (!entry) return Effect.void
        entries.delete(requestId)
        return Schema.decode(Rpc.exitSchema(entry.rpc as any))(message.exit).pipe(
          Effect.locally(FiberRef.currentContext, entry.context),
          Effect.orDie,
          Effect.matchCauseEffect({
            onSuccess: (exit) => write({ _tag: "Exit", clientId: 0, requestId, exit }),
            onFailure: (cause) => write({ _tag: "Exit", clientId: 0, requestId, exit: Exit.failCause(cause) })
          })
        ) as Effect.Effect<void>
      }
      case "Defect": {
        entries.clear()
        return write({ _tag: "Defect", clientId: 0, defect: decodeDefect(message.defect) })
      }
      case "ClientProtocolError": {
        const exit = Exit.fail(message.error)
        return Effect.forEach(
          entries.keys(),
          (requestId) => {
            entries.delete(requestId)
            return write({ _tag: "Exit", clientId: 0, requestId, exit: exit as any })
          }
        )
      }
      default: {
        return Effect.void
      }
    }
  }).pipe(
    Effect.catchAllCause(Effect.logError),
    Effect.interruptible,
    Effect.forkScoped
  )

  return client
})

/**
 * @since 1.0.0
 * @category headers
 */
export const currentHeaders: FiberRef.FiberRef<Headers.Headers> = globalValue(
  "@effect/rpc/RpcClient/currentHeaders",
  () => FiberRef.unsafeMake(Headers.empty)
)

/**
 * @since 1.0.0
 * @category headers
 */
export const withHeaders: {
  (headers: Headers.Input): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, headers: Headers.Input): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, headers: Headers.Input): Effect.Effect<A, E, R> =>
    Effect.locallyWith(effect, currentHeaders, Headers.merge(Headers.fromInput(headers)))
)

/**
 * @since 1.0.0
 * @category headers
 */
export const withHeadersEffect: {
  <E2, R2>(
    headers: Effect.Effect<Headers.Input, E2, R2>
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2, R | R2>
  <A, E, R, E2, R2>(
    effect: Effect.Effect<A, E, R>,
    headers: Effect.Effect<Headers.Input, E2, R2>
  ): Effect.Effect<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, E2, R2>(
    effect: Effect.Effect<A, E, R>,
    headers: Effect.Effect<Headers.Input, E2, R2>
  ): Effect.Effect<A, E | E2, R | R2> => Effect.flatMap(headers, (headers) => withHeaders(effect, headers))
)

/**
 * @since 1.0.0
 * @category protocol
 */
export class Protocol extends Context.Tag("@effect/rpc/RpcClient/Protocol")<Protocol, {
  readonly run: (
    f: (data: FromServerEncoded) => Effect.Effect<void>
  ) => Effect.Effect<never>
  readonly send: (
    request: FromClientEncoded,
    transferables?: ReadonlyArray<globalThis.Transferable>
  ) => Effect.Effect<void, RpcClientError>
  readonly supportsAck: boolean
  readonly supportsTransferables: boolean
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
export const makeProtocolHttp = (client: HttpClient.HttpClient): Effect.Effect<
  Protocol["Type"],
  never,
  RpcSerialization.RpcSerialization
> =>
  Protocol.make(Effect.fnUntraced(function*(writeResponse) {
    const serialization = yield* RpcSerialization.RpcSerialization
    const isJson = serialization.contentType === "application/json"

    const send = (request: FromClientEncoded): Effect.Effect<void, RpcClientError> => {
      if (request._tag !== "Request") {
        return Effect.void
      }

      const parser = serialization.unsafeMake()

      const encoded = parser.encode(request)!
      const body = typeof encoded === "string" ?
        HttpBody.text(encoded, serialization.contentType) :
        HttpBody.uint8Array(encoded, serialization.contentType)

      if (isJson) {
        return client.post("", { body }).pipe(
          Effect.flatMap((r) => r.json),
          Effect.mapError((cause) =>
            new RpcClientError({
              reason: "Protocol",
              message: "Failed to send HTTP request",
              cause
            })
          ),
          Effect.flatMap((u) => {
            if (!Array.isArray(u)) {
              return Effect.dieMessage(`Expected an array of responses, but got: ${u}`)
            }
            let i = 0
            return Effect.whileLoop({
              while: () => i < u.length,
              body: () => writeResponse(u[i++]),
              step: constVoid
            })
          })
        )
      }

      return client.post("", { body }).pipe(
        Effect.flatMap((r) =>
          Stream.runForEachChunk(r.stream, (chunk) => {
            const responses = Chunk.toReadonlyArray(chunk).flatMap(parser.decode) as Array<FromServerEncoded>
            if (responses.length === 0) return Effect.void
            let i = 0
            return Effect.whileLoop({
              while: () => i < responses.length,
              body: () => writeResponse(responses[i++]),
              step: constVoid
            })
          })
        ),
        Effect.mapError((cause) =>
          new RpcClientError({
            reason: "Protocol",
            message: "Failed to send HTTP request",
            cause
          })
        )
      )
    }

    return {
      send,
      supportsAck: false,
      supportsTransferables: false
    }
  }))

/**
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolHttp = (options: {
  readonly url: string
  readonly transformClient?: <E, R>(client: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>
}): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | HttpClient.HttpClient> =>
  Layer.scoped(
    Protocol,
    Effect.flatMap(
      HttpClient.HttpClient,
      (client) => {
        client = HttpClient.mapRequest(client, HttpClientRequest.prependUrl(options.url))
        return makeProtocolHttp(options.transformClient ? options.transformClient(client) : client)
      }
    )
  )

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolSocket = (options?: {
  readonly retryTransientErrors?: boolean | undefined
  readonly retrySchedule?: Schedule.Schedule<any, Socket.SocketError> | undefined
}): Effect.Effect<
  Protocol["Type"],
  never,
  Scope.Scope | RpcSerialization.RpcSerialization | Socket.Socket
> =>
  Protocol.make(Effect.fnUntraced(function*(writeResponse) {
    const socket = yield* Socket.Socket
    const serialization = yield* RpcSerialization.RpcSerialization
    const write = yield* socket.writer
    let parser = serialization.unsafeMake()
    const pinger = yield* makePinger(write(parser.encode(constPing)!))

    let currentError: RpcClientError | undefined
    const clearCurrentError = Effect.sync(() => {
      currentError = undefined
    })

    yield* Effect.suspend(() => {
      parser = serialization.unsafeMake()
      pinger.reset()
      return socket.runRaw((message) => {
        try {
          const responses = parser.decode(message) as Array<FromServerEncoded>
          if (responses.length === 0) return
          let i = 0
          return Effect.whileLoop({
            while: () => i < responses.length,
            body: () => {
              const response = responses[i++]
              if (response._tag === "Pong") {
                pinger.onPong()
              }
              return writeResponse(response)
            },
            step: constVoid
          })
        } catch (defect) {
          return writeResponse({
            _tag: "ClientProtocolError",
            error: new RpcClientError({
              reason: "Protocol",
              message: "Error decoding message",
              cause: Cause.fail(defect)
            })
          })
        }
      }, { onOpen: clearCurrentError }).pipe(
        Effect.raceFirst(Effect.zipRight(
          pinger.timeout,
          Effect.fail(
            new Socket.SocketGenericError({
              reason: "OpenTimeout",
              cause: new Error("ping timeout")
            })
          )
        ))
      )
    }).pipe(
      Effect.zipRight(Effect.fail(
        new Socket.SocketCloseError({
          reason: "Close",
          code: 1000
        })
      )),
      Effect.tapErrorCause((cause) => {
        const error = Cause.failureOption(cause)
        if (
          options?.retryTransientErrors && Option.isSome(error) &&
          (error.value.reason === "Open" || error.value.reason === "OpenTimeout")
        ) {
          return Effect.void
        }
        currentError = new RpcClientError({
          reason: "Protocol",
          message: "Error in socket",
          cause: Cause.squash(cause)
        })
        return writeResponse({
          _tag: "ClientProtocolError",
          error: currentError
        })
      }),
      Effect.retry(options?.retrySchedule ?? defaultRetrySchedule),
      Effect.annotateLogs({
        module: "RpcClient",
        method: "makeProtocolSocket"
      }),
      Effect.interruptible,
      Effect.forkScoped
    )

    return {
      send(request) {
        if (currentError) {
          return Effect.fail(currentError)
        }
        const encoded = parser.encode(request)
        if (encoded === undefined) return Effect.void
        return Effect.orDie(write(encoded))
      },
      supportsAck: true,
      supportsTransferables: false
    }
  }))

const defaultRetrySchedule = Schedule.exponential(500, 1.5).pipe(
  Schedule.union(Schedule.spaced(5000))
)

const makePinger = Effect.fnUntraced(function*<A, E, R>(writePing: Effect.Effect<A, E, R>) {
  let recievedPong = true
  const latch = Effect.unsafeMakeLatch()
  const reset = () => {
    recievedPong = true
    latch.unsafeClose()
  }
  const onPong = () => {
    recievedPong = true
  }
  yield* Effect.suspend(() => {
    if (!recievedPong) return latch.open
    recievedPong = false
    return writePing
  }).pipe(
    Effect.delay("10 seconds"),
    Effect.ignore,
    Effect.forever,
    Effect.interruptible,
    Effect.forkScoped
  )
  return { timeout: latch.await, reset, onPong } as const
})

/**
 * @since 1.0.0
 * @category protocol
 */
export const makeProtocolWorker = (
  options: {
    readonly size: number
    readonly concurrency?: number | undefined
    readonly targetUtilization?: number | undefined
  } | {
    readonly minSize: number
    readonly maxSize: number
    readonly concurrency?: number | undefined
    readonly targetUtilization?: number | undefined
    readonly timeToLive: Duration.DurationInput
  }
): Effect.Effect<
  Protocol["Type"],
  WorkerError,
  Scope.Scope | Worker.PlatformWorker | Worker.Spawner
> =>
  Protocol.make(Effect.fnUntraced(function*(writeResponse) {
    const worker = yield* Worker.PlatformWorker
    const scope = yield* Effect.scope
    let workerId = 0
    const initialMessage = yield* Effect.serviceOption(RpcWorker.InitialMessage)

    const entries = new Map<string, {
      readonly worker: Worker.BackingWorker<FromClientEncoded | RpcWorker.InitialMessage.Encoded, FromServerEncoded>
      readonly latch: Effect.Latch
    }>()

    const acquire = Effect.gen(function*() {
      const id = workerId++
      const backing = yield* worker.spawn<FromClientEncoded | RpcWorker.InitialMessage.Encoded, FromServerEncoded>(id)
      const readyLatch = yield* Effect.makeLatch()

      yield* backing.run((message) => {
        if (message[0] === 0) {
          return readyLatch.open
        }
        const response = message[1]
        if (response._tag === "Exit") {
          const entry = entries.get(response.requestId)
          if (entry) {
            entries.delete(response.requestId)
            entry.latch.unsafeOpen()
            return writeResponse(response)
          }
        } else if (response._tag === "Defect") {
          for (const [requestId, entry] of entries) {
            entries.delete(requestId)
            entry.latch.unsafeOpen()
          }
          return writeResponse(response)
        }
        return writeResponse(response)
      }).pipe(
        Effect.tapErrorCause((cause) =>
          writeResponse({
            _tag: "ClientProtocolError",
            error: new RpcClientError({
              reason: "Protocol",
              message: "Error in worker",
              cause: Cause.squash(cause)
            })
          })
        ),
        Effect.retry(Schedule.spaced(1000)),
        Effect.annotateLogs({
          module: "RpcClient",
          method: "makeProtocolWorker"
        }),
        Effect.interruptible,
        Effect.forkScoped
      )

      yield* readyLatch.await

      if (Option.isSome(initialMessage)) {
        const [value, transfers] = yield* initialMessage.value
        yield* backing.send({ _tag: "InitialMessage", value }, transfers)
      }

      return backing
    })

    const pool = "minSize" in options ?
      yield* Pool.makeWithTTL({
        acquire,
        min: options.minSize,
        max: options.maxSize,
        concurrency: options.concurrency,
        targetUtilization: options.targetUtilization,
        timeToLive: options.timeToLive
      }) :
      yield* Pool.make({
        acquire,
        size: options.size,
        concurrency: options.concurrency,
        targetUtilization: options.targetUtilization
      })

    yield* Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        for (const entry of entries.values()) {
          entry.latch.unsafeOpen()
        }
        entries.clear()
      })
    )

    const send = (request: FromClientEncoded, transferables?: ReadonlyArray<globalThis.Transferable>) => {
      switch (request._tag) {
        case "Request": {
          return pool.get.pipe(
            Effect.flatMap((worker) => {
              const latch = Effect.unsafeMakeLatch(false)
              entries.set(request.id, { worker, latch })
              return Effect.zipRight(worker.send(request, transferables), latch.await)
            }),
            Effect.scoped,
            Effect.orDie
          )
        }
        case "Interrupt": {
          const entry = entries.get(request.requestId)
          if (!entry) return Effect.void
          entries.delete(request.requestId)
          entry.latch.unsafeOpen()
          return Effect.orDie(entry.worker.send(request))
        }
        case "Ack": {
          const entry = entries.get(request.requestId)
          if (!entry) return Effect.void
          return Effect.orDie(entry.worker.send(request))
        }
      }
      return Effect.void
    }

    yield* Effect.scoped(pool.get)

    return {
      send,
      supportsAck: true,
      supportsTransferables: true
    }
  }))

/**
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolWorker = (
  options: {
    readonly size: number
    readonly concurrency?: number | undefined
    readonly targetUtilization?: number | undefined
  } | {
    readonly minSize: number
    readonly maxSize: number
    readonly concurrency?: number | undefined
    readonly targetUtilization?: number | undefined
    readonly timeToLive: Duration.DurationInput
  }
): Layer.Layer<Protocol, WorkerError, Worker.PlatformWorker | Worker.Spawner> =>
  Layer.scoped(Protocol, makeProtocolWorker(options))

/**
 * @since 1.0.0
 * @category protocol
 */
export const layerProtocolSocket = (options?: {
  readonly retryTransientErrors?: boolean | undefined
  readonly retrySchedule?: Schedule.Schedule<any, Socket.SocketError> | undefined
}): Layer.Layer<
  Protocol,
  never,
  Socket.Socket | RpcSerialization.RpcSerialization
> => Layer.scoped(Protocol, makeProtocolSocket(options))

// internal

const decodeDefect = Schema.decodeSync(Schema.Defect)
