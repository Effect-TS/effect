/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual, pipe } from "effect/Function"
import * as Mailbox from "effect/Mailbox"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import { StreamRequestTypeId, withRequestTag } from "./internal/rpc.js"
import * as Rpc from "./Rpc.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/rpc/RpcRouter")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isRpcRouter = (u: unknown): u is RpcRouter<any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface RpcRouter<Reqs extends Schema.TaggedRequest.All, R> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly rpcs: ReadonlySet<Rpc.Rpc<Reqs, R>>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace RpcRouter {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A extends RpcRouter<any, any>> = A extends RpcRouter<infer Req, infer R>
    ? R | Serializable.SerializableWithResult.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextRaw<A extends RpcRouter<any, any>> = A extends RpcRouter<infer Req, infer R>
    ? R | Serializable.Serializable.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<A extends RpcRouter<any, any>> = A extends RpcRouter<infer Req, infer _R> ? Req
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Response = [
    index: number,
    response: Schema.ExitEncoded<any, any, unknown> | ReadonlyArray<Schema.ExitEncoded<any, any, unknown>>
  ]

  /**
   * @since 1.0.0
   * @category models
   */
  export type ResponseEffect =
    | Schema.ExitEncoded<any, any, unknown>
    | ReadonlyArray<Schema.ExitEncoded<any, any, unknown>>
}

const fromSet = <Reqs extends Schema.TaggedRequest.All, R>(
  rpcs: ReadonlySet<Rpc.Rpc<Reqs, R>>
): RpcRouter<Reqs, R> => ({
  [TypeId]: TypeId,
  rpcs,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Rpcs extends ReadonlyArray<Rpc.Rpc<any, any> | RpcRouter<any, any>>>(
  ...rpcs: Rpcs
): RpcRouter<
  | Rpc.Rpc.Request<
    Extract<Rpcs[number], { readonly [Rpc.TypeId]: Rpc.TypeId }>
  >
  | RpcRouter.Request<
    Extract<Rpcs[number], { readonly [TypeId]: TypeId }>
  >,
  | Rpc.Rpc.Context<
    Extract<Rpcs[number], { readonly [Rpc.TypeId]: Rpc.TypeId }>
  >
  | RpcRouter.Context<
    Extract<Rpcs[number], { readonly [TypeId]: TypeId }>
  >
> => {
  const rpcSet = new Set<Rpc.Rpc<any, any>>()
  rpcs.forEach((rpc) => {
    if (isRpcRouter(rpc)) {
      rpc.rpcs.forEach((rpc) => rpcSet.add(rpc))
    } else {
      rpcSet.add(rpc)
    }
  })
  return fromSet(rpcSet)
}

/**
 * @since 1.0.0
 * @category context
 */
export const provideServiceEffect: {
  <I, S, E, R2>(
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): <Reqs extends Schema.TaggedRequest.All, R>(self: RpcRouter<Reqs, R>) => RpcRouter<Reqs, Exclude<R, I> | R2>
  <Reqs extends Schema.TaggedRequest.All, R, I, S, E, R2>(
    self: RpcRouter<Reqs, R>,
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): RpcRouter<Reqs, Exclude<R, I> | R2>
} = dual(3, <Reqs extends Schema.TaggedRequest.All, R, I, S, E, R2>(
  self: RpcRouter<Reqs, R>,
  tag: Context.Tag<I, S>,
  effect: Effect.Effect<S, E, R2>
): RpcRouter<Reqs, Exclude<R, I> | R2> => fromSet(new Set([...self.rpcs].map(Rpc.provideServiceEffect(tag, effect)))))

/**
 * @since 1.0.0
 * @category context
 */
export const provideService: {
  <I, S>(
    tag: Context.Tag<I, S>,
    service: S
  ): <Reqs extends Schema.TaggedRequest.All, R>(self: RpcRouter<Reqs, R>) => RpcRouter<Reqs, Exclude<R, I>>
  <Reqs extends Schema.TaggedRequest.All, R, I, S>(
    self: RpcRouter<Reqs, R>,
    tag: Context.Tag<I, S>,
    service: S
  ): RpcRouter<Reqs, Exclude<R, I>>
} = dual(3, <Reqs extends Schema.TaggedRequest.All, R, I, S>(
  self: RpcRouter<Reqs, R>,
  tag: Context.Tag<I, S>,
  service: S
): RpcRouter<Reqs, Exclude<R, I>> => fromSet(new Set([...self.rpcs].map(Rpc.provideService(tag, service)))))

const emptyExit = Schema.encodeSync(Schema.Exit({
  failure: Schema.Never,
  success: Schema.Never,
  defect: Schema.Defect
}))(Exit.failCause(Cause.empty))

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandler: {
  (options?: {
    readonly spanPrefix?: string
  }): <R extends RpcRouter<any, any>>(
    self: R
  ) => (u: unknown) => Stream.Stream<RpcRouter.Response, ParseError, RpcRouter.Context<R>>
  <R extends RpcRouter<any, any>>(self: R, options?: {
    readonly spanPrefix?: string
  }): (u: unknown) => Stream.Stream<RpcRouter.Response, ParseError, RpcRouter.Context<R>>
} = dual(
  (args) => isRpcRouter(args[0]),
  <R extends RpcRouter<any, any>>(router: R, options?: { readonly spanPrefix?: string }) => {
    const spanPrefix = options?.spanPrefix ?? "Rpc.router "
    const schema = Schema.Union(
      ...[...router.rpcs].map((rpc) =>
        Schema.transform(
          rpc.schema,
          Schema.Tuple(Schema.typeSchema(rpc.schema), Schema.Any),
          { strict: true, decode: (request) => [request, rpc] as const, encode: ([request]) => request }
        )
      )
    )
    const schemaArray = Schema.Array(Rpc.RequestSchema(schema))
    const decode = Schema.decodeUnknown(schemaArray)
    const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
    const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))

    return (u: unknown): Stream.Stream<RpcRouter.Response, ParseError, RpcRouter.Context<R>> =>
      pipe(
        decode(u),
        Effect.zip(Mailbox.make<RpcRouter.Response>(4)),
        Effect.tap(([requests, mailbox]) =>
          pipe(
            Effect.forEach(requests, (req, index) => {
              const [request, rpc] = req.request
              if (rpc._tag === "Effect") {
                const encode = getEncode(request)
                return pipe(
                  Effect.exit(rpc.handler(request)),
                  Effect.flatMap(encode),
                  Effect.orDie,
                  Effect.matchCauseEffect({
                    onSuccess: (response) => mailbox.offer([index, response]),
                    onFailure: (cause) =>
                      Effect.flatMap(
                        encode(Exit.failCause(cause)),
                        (response) => mailbox.offer([index, response])
                      )
                  }),
                  Effect.locally(Rpc.currentHeaders, req.headers as any),
                  Effect.withSpan(`${spanPrefix}${request._tag}`, {
                    kind: "server",
                    parent: {
                      _tag: "ExternalSpan",
                      traceId: req.traceId,
                      spanId: req.spanId,
                      sampled: req.sampled,
                      context: Context.empty()
                    },
                    captureStackTrace: false
                  })
                )
              }
              const encode = getEncodeChunk(request)
              return pipe(
                rpc.handler(request),
                Stream.toChannel,
                Channel.mapOutEffect((chunk) =>
                  Effect.flatMap(
                    encode(Chunk.map(chunk, Exit.succeed)),
                    (response) => mailbox.offer([index, response])
                  )
                ),
                Channel.runDrain,
                Effect.matchCauseEffect({
                  onSuccess: () => mailbox.offer([index, [emptyExit]]),
                  onFailure: (cause) =>
                    Effect.flatMap(
                      encode(Chunk.of(Exit.failCause(cause))),
                      (response) => mailbox.offer([index, response])
                    )
                }),
                Effect.locally(Rpc.currentHeaders, req.headers as any),
                Effect.withSpan(`${spanPrefix}${request._tag}`, {
                  kind: "server",
                  parent: {
                    _tag: "ExternalSpan",
                    traceId: req.traceId,
                    spanId: req.spanId,
                    sampled: req.sampled,
                    context: Context.empty()
                  },
                  captureStackTrace: false
                })
              )
            }, { concurrency: "unbounded", discard: true }),
            Effect.ensuring(mailbox.end),
            Effect.forkScoped
          )
        ),
        Effect.map(([_, mailbox]) => Mailbox.toStream(mailbox)),
        Stream.unwrapScoped
      )
  }
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandlerNoStream: {
  (options?: {
    readonly spanPrefix?: string
  }): <R extends RpcRouter<any, any>>(
    self: R
  ) => (u: unknown) => Effect.Effect<RpcRouter.ResponseEffect, ParseError, RpcRouter.Context<R>>
  <R extends RpcRouter<any, any>>(self: R, options?: {
    readonly spanPrefix?: string
  }): (u: unknown) => Effect.Effect<RpcRouter.ResponseEffect, ParseError, RpcRouter.Context<R>>
} = dual((args) => isRpcRouter(args[0]), <R extends RpcRouter<any, any>>(router: R, options?: {
  readonly spanPrefix?: string
}) => {
  const spanPrefix = options?.spanPrefix ?? "Rpc.router "
  const schema = Schema.Union(
    ...[...router.rpcs].map((rpc) =>
      Schema.transform(
        rpc.schema,
        Schema.typeSchema(Schema.Tuple(rpc.schema, Schema.Any)),
        { strict: true, decode: (request) => [request, rpc] as const, encode: ([request]) => request }
      )
    )
  )
  const schemaArray = Schema.Array(Rpc.RequestSchema(schema))
  const decode = Schema.decodeUnknown(schemaArray)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))

  return (u: unknown): Effect.Effect<Array<RpcRouter.ResponseEffect>, ParseError, RpcRouter.Context<R>> =>
    Effect.flatMap(
      decode(u),
      Effect.forEach((req): Effect.Effect<RpcRouter.ResponseEffect, ParseError, any> => {
        const [request, rpc] = req.request
        if (rpc._tag === "Effect") {
          const encode = getEncode(request)
          return pipe(
            Effect.exit(rpc.handler(request)),
            Effect.flatMap(encode),
            Effect.orDie,
            Effect.locally(Rpc.currentHeaders, req.headers as any),
            Effect.withSpan(`${spanPrefix}${request._tag}`, {
              kind: "server",
              parent: {
                _tag: "ExternalSpan",
                traceId: req.traceId,
                spanId: req.spanId,
                sampled: req.sampled,
                context: Context.empty()
              },
              captureStackTrace: false
            })
          )
        }
        const encode = getEncodeChunk(request)
        return pipe(
          rpc.handler(request),
          Stream.map(Exit.succeed),
          Stream.catchAllCause((cause) => Stream.succeed(Exit.failCause(cause))),
          Stream.runCollect,
          Effect.flatMap(encode),
          Effect.locally(Rpc.currentHeaders, req.headers as any),
          Effect.withSpan(`${spanPrefix}${request._tag}`, {
            kind: "server",
            parent: {
              _tag: "ExternalSpan",
              traceId: req.traceId,
              spanId: req.spanId,
              sampled: req.sampled,
              context: Context.empty()
            },
            captureStackTrace: false
          })
        )
      }, { concurrency: "unbounded" })
    )
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandlerRaw = <R extends RpcRouter<any, any>>(router: R) => {
  const schema: Schema.Schema<
    readonly [Schema.TaggedRequest.All, Rpc.Rpc<any, any>],
    unknown,
    RpcRouter.ContextRaw<R>
  > = Schema.Union(...[...router.rpcs].map((rpc) =>
    Schema.transform(
      Schema.typeSchema(rpc.schema),
      Schema.typeSchema(Schema.Tuple(rpc.schema, Schema.Any)),
      { strict: true, decode: (request) => [request, rpc] as const, encode: ([request]) => request }
    )
  ))
  const parse = Schema.decode(schema)

  return <Req extends RpcRouter.Request<R>>(request: Req): Rpc.Rpc.Result<Req, RpcRouter.ContextRaw<R>> => {
    const isStream = StreamRequestTypeId in request
    const withHandler = parse(request)
    if (isStream) {
      return Stream.unwrap(Effect.map(
        withHandler,
        ([request, rpc]) => rpc.handler(request)
      )) as any
    }
    return Effect.flatMap(
      withHandler,
      ([request, rpc]) => rpc.handler(request) as any
    ) as any
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandlerUndecoded = <R extends RpcRouter<any, any>>(router: R) => {
  const handler = toHandlerRaw(router)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.successSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.ChunkFromSelf(Serializable.successSchema(req))))
  return <Req extends RpcRouter.Request<R>>(request: Req): Rpc.Rpc.ResultUndecoded<Req, RpcRouter.Context<R>> => {
    const result = handler(request)
    if (Effect.isEffect(result)) {
      const encode = getEncode(request)
      return Effect.flatMap(result, encode) as any
    }
    const encode = getEncodeChunk(request)
    return Stream.mapChunksEffect(result as any, encode) as any
  }
}
