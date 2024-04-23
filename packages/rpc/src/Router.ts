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
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { StreamRequestTypeId, withRequestTag } from "./internal/rpc.js"
import * as Rpc from "./Rpc.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/rpc/Router")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isRouter = (u: unknown): u is Router<any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface Router<Reqs extends Schema.TaggedRequest.Any, R> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly rpcs: ReadonlySet<Rpc.Rpc<Reqs, R>>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Router {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A extends Router<any, any>> = A extends Router<infer Req, infer R>
    ? R | Serializable.SerializableWithResult.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextRaw<A extends Router<any, any>> = A extends Router<infer Req, infer R>
    ? R | Serializable.Serializable.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<A extends Router<any, any>> = A extends Router<infer Req, infer _R> ? Req
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Response = [
    index: number,
    response: Schema.ExitEncoded<any, any> | ReadonlyArray<Schema.ExitEncoded<any, any>>
  ]

  /**
   * @since 1.0.0
   * @category models
   */
  export type ResponseEffect = Schema.ExitEncoded<any, any> | ReadonlyArray<Schema.ExitEncoded<any, any>>
}

const fromSet = <Reqs extends Schema.TaggedRequest.Any, R>(
  rpcs: ReadonlySet<Rpc.Rpc<Reqs, R>>
): Router<Reqs, R> => ({
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
export const make = <Rpcs extends ReadonlyArray<Rpc.Rpc<any, any> | Router<any, any>>>(
  ...rpcs: Rpcs
): Router<
  | Rpc.Rpc.Request<
    Extract<Rpcs[number], { readonly [Rpc.TypeId]: Rpc.TypeId }>
  >
  | Router.Request<
    Extract<Rpcs[number], { readonly [TypeId]: TypeId }>
  >,
  | Rpc.Rpc.Context<
    Extract<Rpcs[number], { readonly [Rpc.TypeId]: Rpc.TypeId }>
  >
  | Router.Context<
    Extract<Rpcs[number], { readonly [TypeId]: TypeId }>
  >
> => {
  const rpcSet = new Set<Rpc.Rpc<any, any>>()
  rpcs.forEach((rpc) => {
    if (isRouter(rpc)) {
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
  ): <Reqs extends Schema.TaggedRequest.Any, R>(self: Router<Reqs, R>) => Router<Reqs, Exclude<R, I> | R2>
  <Reqs extends Schema.TaggedRequest.Any, R, I, S, E, R2>(
    self: Router<Reqs, R>,
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): Router<Reqs, Exclude<R, I> | R2>
} = dual(3, <Reqs extends Schema.TaggedRequest.Any, R, I, S, E, R2>(
  self: Router<Reqs, R>,
  tag: Context.Tag<I, S>,
  effect: Effect.Effect<S, E, R2>
): Router<Reqs, Exclude<R, I> | R2> => fromSet(new Set([...self.rpcs].map(Rpc.provideServiceEffect(tag, effect)))))

/**
 * @since 1.0.0
 * @category context
 */
export const provideService: {
  <I, S>(
    tag: Context.Tag<I, S>,
    service: S
  ): <Reqs extends Schema.TaggedRequest.Any, R>(self: Router<Reqs, R>) => Router<Reqs, Exclude<R, I>>
  <Reqs extends Schema.TaggedRequest.Any, R, I, S>(
    self: Router<Reqs, R>,
    tag: Context.Tag<I, S>,
    service: S
  ): Router<Reqs, Exclude<R, I>>
} = dual(3, <Reqs extends Schema.TaggedRequest.Any, R, I, S>(
  self: Router<Reqs, R>,
  tag: Context.Tag<I, S>,
  service: S
): Router<Reqs, Exclude<R, I>> => fromSet(new Set([...self.rpcs].map(Rpc.provideService(tag, service)))))

const EOF = Symbol.for("@effect/rpc/Router/EOF")

const channelFromQueue = <A>(queue: Queue.Queue<A | typeof EOF>) => {
  const loop: Channel.Channel<Chunk.Chunk<A>> = Channel.flatMap(
    Queue.takeBetween(queue, 1, Number.MAX_SAFE_INTEGER),
    (chunk) => {
      if (Chunk.unsafeLast(chunk) === EOF) {
        return Channel.write(Chunk.dropRight(chunk as Chunk.Chunk<A>, 1))
      }
      return Channel.zipRight(Channel.write(chunk as Chunk.Chunk<A>), loop)
    }
  )
  return loop
}

const emptyExit = Schema.encodeSync(Schema.Exit({
  failure: Schema.Never,
  success: Schema.Never
}))(Exit.failCause(Cause.empty))

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandler = <R extends Router<any, any>>(router: R, options?: {
  readonly spanPrefix?: string
}) => {
  const spanPrefix = options?.spanPrefix ?? "Rpc.router "
  const schema: Schema.Schema<any, unknown, readonly [Schema.TaggedRequest.Any, Rpc.Rpc<any, any>]> = Schema
    .Union(
      ...[...router.rpcs].map((rpc) =>
        Schema.transform(
          rpc.schema,
          Schema.typeSchema(Schema.Tuple(rpc.schema, Schema.Any)),
          { decode: (request) => [request, rpc] as const, encode: ([request]) => request }
        )
      )
    )
  const schemaArray = Schema.Array(Rpc.RequestSchema(schema))
  const decode = Schema.decodeUnknown(schemaArray)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))

  return (u: unknown): Stream.Stream<Router.Response, ParseError, Router.Context<R>> =>
    pipe(
      decode(u),
      Effect.zip(Queue.unbounded<Router.Response | typeof EOF>()),
      Effect.tap(([requests, queue]) =>
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
                  onSuccess: (response) => Queue.offer(queue, [index, response]),
                  onFailure: (cause) =>
                    Effect.flatMap(
                      encode(Exit.failCause(cause)),
                      (response) => Queue.offer(queue, [index, response])
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
                  }
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
                  (response) => Queue.offer(queue, [index, response])
                )
              ),
              Channel.runDrain,
              Effect.matchCauseEffect({
                onSuccess: () => Queue.offer(queue, [index, [emptyExit]]),
                onFailure: (cause) =>
                  Effect.flatMap(
                    encode(Chunk.of(Exit.failCause(cause))),
                    (response) => Queue.offer(queue, [index, response])
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
                }
              })
            )
          }, { concurrency: "unbounded", discard: true }),
          Effect.ensuring(Queue.offer(queue, EOF)),
          Effect.fork
        )
      ),
      Effect.map(([_, queue]) => Stream.fromChannel(channelFromQueue(queue))),
      Stream.unwrap
    )
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandlerEffect = <R extends Router<any, any>>(router: R, options?: {
  readonly spanPrefix?: string
}) => {
  const spanPrefix = options?.spanPrefix ?? "Rpc.router "
  const schema: Schema.Schema<any, unknown, readonly [Schema.TaggedRequest.Any, Rpc.Rpc<any, any>]> = Schema
    .Union(
      ...[...router.rpcs].map((rpc) =>
        Schema.transform(
          rpc.schema,
          Schema.typeSchema(Schema.Tuple(rpc.schema, Schema.Any)),
          { decode: (request) => [request, rpc] as const, encode: ([request]) => request }
        )
      )
    )
  const schemaArray = Schema.Array(Rpc.RequestSchema(schema))
  const decode = Schema.decodeUnknown(schemaArray)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))

  return (u: unknown): Effect.Effect<ReadonlyArray<Router.ResponseEffect>, ParseError, Router.Context<R>> =>
    Effect.flatMap(
      decode(u),
      Effect.forEach((req): Effect.Effect<Router.ResponseEffect, ParseError, any> => {
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
              }
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
            }
          })
        )
      }, { concurrency: "unbounded" })
    )
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandlerRaw = <R extends Router<any, any>>(router: R) => {
  const schema: Schema.Schema<
    readonly [Schema.TaggedRequest.Any, Rpc.Rpc<any, any>],
    unknown,
    Router.ContextRaw<R>
  > = Schema.Union(...[...router.rpcs].map((rpc) =>
    Schema.transform(
      Schema.typeSchema(rpc.schema),
      Schema.typeSchema(Schema.Tuple(rpc.schema, Schema.Any)),
      { decode: (request) => [request, rpc] as const, encode: ([request]) => request }
    )
  ))
  const parse = Schema.decode(schema)

  return <Req extends Router.Request<R>>(request: Req): Rpc.Rpc.Result<Req, Router.ContextRaw<R>> => {
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
export const toHandlerUndecoded = <R extends Router<any, any>>(router: R) => {
  const handler = toHandlerRaw(router)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.successSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.ChunkFromSelf(Serializable.successSchema(req))))
  return <Req extends Router.Request<R>>(request: Req): Rpc.Rpc.ResultUndecoded<Req, Router.Context<R>> => {
    const result = handler(request)
    if (Effect.isEffect(result)) {
      const encode = getEncode(request)
      return Effect.flatMap(result, encode) as any
    }
    const encode = getEncodeChunk(request)
    return Stream.mapChunksEffect(result, encode) as any
  }
}
