/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
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
import { StreamRequestTypeId, withRequestTag } from "./internal/rpc.js"
import type * as Router from "./Router.js"
import * as Rpc from "./Rpc.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <HR, E>(
  handler: (u: ReadonlyArray<unknown>) => Stream.Stream<unknown, E, HR>
) =>
<R extends Router.Router<any, any>>(): RequestResolver.RequestResolver<
  Rpc.Request<Router.Router.Request<R>>,
  Serializable.SerializableWithResult.Context<Router.Router.Request<R>> | HR
> => {
  const getDecode = withRequestTag((req) => Schema.decodeUnknown(Serializable.exitSchema(req)))
  const getDecodeChunk = withRequestTag((req) => Schema.decodeUnknown(Schema.Chunk(Serializable.exitSchema(req))))

  return RequestResolver.makeBatched((requests: Arr.NonEmptyArray<Rpc.Request<Schema.TaggedRequest.Any>>) => {
    const [effectRequests, streamRequests] = Arr.partition(
      requests,
      (_): _ is Rpc.Request<Rpc.StreamRequest.Any> => StreamRequestTypeId in _.request
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
            (_): _ is Router.Router.Response => Arr.isArray(_) && _.length === 2
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
              Stream.mapEffect((_) => Effect.orDie(decode((_ as Router.Router.Response)[1]))),
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
    self: RequestResolver.RequestResolver<Rpc.Request<Req>, R>
  ) => RequestResolver.RequestResolver<Rpc.Request<Req>, R>
  <Req extends Schema.TaggedRequest.Any, R>(
    self: RequestResolver.RequestResolver<Rpc.Request<Req>, R>,
    headers: Headers.Input
  ): RequestResolver.RequestResolver<Rpc.Request<Req>, R>
} = dual(2, <Req extends Schema.TaggedRequest.Any, R>(
  self: RequestResolver.RequestResolver<Rpc.Request<Req>, R>,
  headers: Headers.Input
): RequestResolver.RequestResolver<Rpc.Request<Req>, R> => {
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
    self: RequestResolver.RequestResolver<Rpc.Request<Req>, R>
  ) => RequestResolver.RequestResolver<Rpc.Request<Req>, R | R2>
  <Req extends Schema.TaggedRequest.Any, R, E, R2>(
    self: RequestResolver.RequestResolver<Rpc.Request<Req>, R>,
    headers: Effect.Effect<Headers.Input, E, R2>
  ): RequestResolver.RequestResolver<Rpc.Request<Req>, R | R2>
} = dual(2, <Req extends Schema.TaggedRequest.Any, R, E, R2>(
  self: RequestResolver.RequestResolver<Rpc.Request<Req>, R>,
  headers: Effect.Effect<Headers.Input, E, R2>
): RequestResolver.RequestResolver<Rpc.Request<Req>, R | R2> =>
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
    | RequestResolver.RequestResolver<Rpc.Request<any>, never>
    | Effect.Effect<RequestResolver.RequestResolver<Rpc.Request<any>, never>, never, any>
> = R extends Effect.Effect<RequestResolver.RequestResolver<Rpc.Request<infer RReq>>, infer _E, infer R> ?
  (<Req extends RReq>(request: Req) => Rpc.Rpc.Result<Req, R>)
  : R extends RequestResolver.RequestResolver<Rpc.Request<infer RReq>, never> ?
    (<Req extends RReq>(request: Req) => Rpc.Rpc.Result<Req>)
  : never

/**
 * @since 1.0.0
 * @category combinators
 */
export const toClient = <
  R extends
    | RequestResolver.RequestResolver<Rpc.Request<any>, never>
    | Effect.Effect<RequestResolver.RequestResolver<Rpc.Request<any>, never>, never, any>
>(
  resolver: R,
  options?: {
    readonly spanPrefix?: string
  }
): Client<R> => ((request: Schema.TaggedRequest.Any) => Rpc.call(request, resolver, options)) as any
