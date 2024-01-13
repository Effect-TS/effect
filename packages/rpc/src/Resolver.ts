/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"
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
  const getDecodeChunk = withRequestTag((req) => Schema.decodeUnknown(Schema.chunk(Serializable.exitSchema(req))))

  return RequestResolver.makeBatched((requests: Array<Rpc.Request<Schema.TaggedRequest.Any>>) => {
    const [effectRequests, streamRequests] = ReadonlyArray.partition(
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
            (_): _ is Router.Router.Response => Array.isArray(_) && _.length === 2
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
export const toClient = <RReq extends Schema.TaggedRequest.Any>(
  resolver: RequestResolver.RequestResolver<Rpc.Request<RReq>, never>
): <Req extends RReq>(request: Req) => Rpc.Rpc.Result<Req> =>
(request) => Rpc.call(request, resolver)
