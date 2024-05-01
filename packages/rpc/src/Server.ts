/**
 * @since 1.0.0
 */
import * as Handler from "@effect/platform/Handler"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { withRequestTag } from "./internal/request.js"
import * as RpcRequest from "./Request.js"

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
export const fromGroup = <R extends Handler.Group.Any>(self: R, options?: {
  readonly spanPrefix?: string
}) => {
  const spanPrefix = options?.spanPrefix ?? "Rpc.router "
  const schema: Schema.Schema<any, unknown, readonly [Schema.TaggedRequest.Any, Handler.Handler.Any]> = Schema
    .Union(
      ...Handler.getChildren(self).map((handler) =>
        Schema.transform(
          handler.schema,
          Schema.typeSchema(Schema.Tuple(handler.schema, Schema.Any)),
          { decode: (request) => [request, handler] as const, encode: ([request]) => request }
        )
      )
    )
  const schemaArray = Schema.Array(RpcRequest.RequestSchema(schema))
  const decode = Schema.decodeUnknown(schemaArray)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))

  return (u: unknown): Stream.Stream<Response, ParseError, Handler.Group.Context<R>> =>
    pipe(
      decode(u),
      Effect.zip(Queue.unbounded<Response | typeof EOF>()),
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
                Effect.locally(RpcRequest.currentHeaders, req.headers as any),
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
              Effect.locally(RpcRequest.currentHeaders, req.headers as any),
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
export const fromGroupEffect = <R extends Handler.Group.Any>(self: R, options?: {
  readonly spanPrefix?: string
}) => {
  const spanPrefix = options?.spanPrefix ?? "Rpc.router "
  const schema: Schema.Schema<any, unknown, readonly [Schema.TaggedRequest.Any, Handler.Handler.Any]> = Schema
    .Union(
      ...Handler.getChildren(self).map((handler) =>
        Schema.transform(
          handler.schema,
          Schema.typeSchema(Schema.Tuple(handler.schema, Schema.Any)),
          { decode: (request) => [request, handler] as const, encode: ([request]) => request }
        )
      )
    )
  const schemaArray = Schema.Array(RpcRequest.RequestSchema(schema))
  const decode = Schema.decodeUnknown(schemaArray)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))

  return (u: unknown): Effect.Effect<ReadonlyArray<ResponseEffect>, ParseError, Handler.Group.Context<R>> =>
    Effect.flatMap(
      decode(u),
      Effect.forEach((req): Effect.Effect<ResponseEffect, ParseError, any> => {
        const [request, rpc] = req.request
        if (rpc._tag === "Effect") {
          const encode = getEncode(request)
          return pipe(
            Effect.exit(rpc.handler(request)),
            Effect.flatMap(encode),
            Effect.orDie,
            Effect.locally(RpcRequest.currentHeaders, req.headers as any),
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
          Effect.locally(RpcRequest.currentHeaders, req.headers as any),
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
export const fromGroupRaw = <R extends Handler.Group.Any>(self: R) => {
  const schema: Schema.Schema<
    readonly [Schema.TaggedRequest.Any, Handler.Handler.Any],
    unknown,
    Handler.Group.ContextRaw<R>
  > = Schema.Union(
    ...Handler.getChildren(self).map((handler) =>
      Schema.transform(
        Schema.typeSchema(handler.schema),
        Schema.typeSchema(Schema.Tuple(handler.schema, Schema.Any)),
        { decode: (request) => [request, handler] as const, encode: ([request]) => request }
      )
    )
  )
  const parse = Schema.decode(schema)

  return <Req extends Handler.Group.Request<R>>(
    request: Req
  ): Handler.Handler.Result<Req, Handler.Group.ContextRaw<R>> => {
    const isStream = Handler.StreamRequestTypeId in request
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
export const fromGroupUndecoded = <R extends Handler.Group.Any>(self: R) => {
  const handler = fromGroupRaw(self)
  const getEncode = withRequestTag((req) => Schema.encode(Serializable.successSchema(req)))
  const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.ChunkFromSelf(Serializable.successSchema(req))))
  return <Req extends Handler.Group.Request<R>>(
    request: Req
  ): Handler.Handler.ResultUndecoded<Req, Handler.Group.Context<R>> => {
    const result = handler(request)
    if (Effect.isEffect(result)) {
      const encode = getEncode(request)
      return Effect.flatMap(result, encode) as any
    }
    const encode = getEncodeChunk(request)
    return Stream.mapChunksEffect(result, encode) as any
  }
}
