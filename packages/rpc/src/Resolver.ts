/**
 * @since 1.0.0
 */
import * as Handler from "@effect/platform/Handler"
import * as Headers from "@effect/platform/Http/Headers"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual, pipe } from "effect/Function"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import * as Stream from "effect/Stream"
import { withRequestTag } from "./internal/request.js"
import * as RpcRequest from "./Request.js"
import type * as Router from "./Server.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <HR, E>(
  handler: (u: ReadonlyArray<unknown>) => Stream.Stream<unknown, E, HR>
) =>
<R extends Handler.Group.Any>(): RequestResolver.RequestResolver<
  RpcRequest.Request<Handler.Group.Request<R>>,
  Serializable.SerializableWithResult.Context<Handler.Group.Request<R>> | HR
> => {
  const getDecode = withRequestTag((req) => Schema.decodeUnknown(Serializable.exitSchema(req)))
  const getDecodeChunk = withRequestTag((req) => Schema.decodeUnknown(Schema.Chunk(Serializable.exitSchema(req))))

  return RequestResolver.makeBatched((requests: Arr.NonEmptyArray<RpcRequest.Request<Schema.TaggedRequest.Any>>) => {
    const [effectRequests, streamRequests] = Arr.partition(
      requests,
      (_): _ is RpcRequest.Request<Handler.StreamRequest.Any> => Handler.StreamRequestTypeId in _.request
    )

    const processEffects = pipe(
      Effect.forEach(effectRequests, (_) =>
        Effect.map(
          Serializable.serialize(_.request),
          (request) => ({ ..._, request })
        )),
      Effect.flatMap((payload) =>
        Stream.runForEach(
          Stream.filter(
            handler(payload),
            (_): _ is Router.Response => Arr.isArray(_) && _.length === 2
          ),
          ([index, response]): Effect.Effect<void, ParseError, any> => {
            const request = effectRequests[index]
            return Effect.matchCauseEffect(Effect.orDie(getDecode(request.request)(response)), {
              onFailure: (cause) => Request.failCause(request, cause as any),
              onSuccess: (exit) => Request.complete(request, exit as any)
            })
          }
        )
      ),
      Effect.orDie,
      Effect.catchAllCause((cause) =>
        Effect.forEach(
          effectRequests,
          (request) => Request.failCause(request, cause),
          { discard: true }
        )
      )
    )

    const processStreams = pipe(
      Effect.forEach(streamRequests, (request) => {
        const decode = getDecodeChunk(request.request)
        const stream = pipe(
          Serializable.serialize(request.request),
          Effect.map((_) => ({ ...request, request: _ })),
          Effect.map((payload) =>
            pipe(
              handler([payload]),
              Stream.mapEffect((_) => Effect.orDie(decode((_ as Router.Response)[1]))),
              Stream.flattenChunks,
              Stream.flatMap(Exit.match({
                onFailure: (cause) => Cause.isEmptyType(cause) ? Stream.empty : Stream.failCause(cause),
                onSuccess: Stream.succeed
              }))
            )
          ),
          Effect.orDie,
          Stream.unwrap
        )
        return Request.succeed(request, stream as any)
      }, { discard: true }),
      Effect.catchAllCause((cause) =>
        Effect.forEach(
          streamRequests,
          (request) => Request.failCause(request, cause),
          { discard: true }
        )
      )
    )

    return Effect.zipRight(processStreams, processEffects)
  })
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const annotateHeaders: {
  (
    headers: Headers.Input
  ): <Req extends Schema.TaggedRequest.Any, R>(
    self: RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>
  ) => RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>
  <Req extends Schema.TaggedRequest.Any, R>(
    self: RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>,
    headers: Headers.Input
  ): RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>
} = dual(2, <Req extends Schema.TaggedRequest.Any, R>(
  self: RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>,
  headers: Headers.Input
): RequestResolver.RequestResolver<RpcRequest.Request<Req>, R> => {
  const resolved = Headers.fromInput(headers)
  return RequestResolver.makeWithEntry((requests) => {
    requests.forEach((entries) =>
      entries.forEach((entry) => {
        ;(entry.request as any).headers = Headers.merge(entry.request.headers, resolved)
      })
    )
    return self.runAll(requests)
  })
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const annotateHeadersEffect: {
  <E, R2>(
    headers: Effect.Effect<Headers.Input, E, R2>
  ): <Req extends Schema.TaggedRequest.Any, R>(
    self: RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>
  ) => RequestResolver.RequestResolver<RpcRequest.Request<Req>, R | R2>
  <Req extends Schema.TaggedRequest.Any, R, E, R2>(
    self: RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>,
    headers: Effect.Effect<Headers.Input, E, R2>
  ): RequestResolver.RequestResolver<RpcRequest.Request<Req>, R | R2>
} = dual(2, <Req extends Schema.TaggedRequest.Any, R, E, R2>(
  self: RequestResolver.RequestResolver<RpcRequest.Request<Req>, R>,
  headers: Effect.Effect<Headers.Input, E, R2>
): RequestResolver.RequestResolver<RpcRequest.Request<Req>, R | R2> =>
  RequestResolver.makeWithEntry((requests) =>
    headers.pipe(
      Effect.map(Headers.fromInput),
      Effect.orDie,
      Effect.matchCauseEffect({
        onFailure: (cause) =>
          Effect.forEach(
            requests.flat(),
            (entry) => Request.failCause(entry.request, cause),
            { discard: true }
          ),
        onSuccess: (resolved) => {
          requests.forEach((entries) =>
            entries.forEach((entry) => {
              ;(entry.request as any).headers = Headers.merge(entry.request.headers, resolved)
            })
          )
          return self.runAll(requests)
        }
      })
    )
  ))

/**
 * @since 1.0.0
 * @category models
 */
export type Client<
  R extends
    | RequestResolver.RequestResolver<RpcRequest.Request<any>, never>
    | Effect.Effect<RequestResolver.RequestResolver<RpcRequest.Request<any>, never>, never, any>
> = R extends Effect.Effect<RequestResolver.RequestResolver<RpcRequest.Request<infer RReq>>, infer _E, infer R> ?
  (<Req extends RReq>(request: Req) => Handler.Handler.Result<Req, R>)
  : R extends RequestResolver.RequestResolver<RpcRequest.Request<infer RReq>, never> ?
    (<Req extends RReq>(request: Req) => Handler.Handler.Result<Req>)
  : never

/**
 * @since 1.0.0
 * @category combinators
 */
export const toClient = <
  R extends
    | RequestResolver.RequestResolver<RpcRequest.Request<any>, never>
    | Effect.Effect<RequestResolver.RequestResolver<RpcRequest.Request<any>, never>, never, any>
>(
  resolver: R,
  options?: {
    readonly spanPrefix?: string
  }
): Client<R> => ((request: Schema.TaggedRequest.Any) => RpcRequest.call(request, resolver, options)) as any
