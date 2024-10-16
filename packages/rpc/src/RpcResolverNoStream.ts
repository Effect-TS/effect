/**
 * @since 1.0.0
 */
import type { NonEmptyArray } from "effect/Array"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { StreamRequestTypeId, withRequestTag } from "./internal/rpc.js"
import type * as Rpc from "./Rpc.js"
import type * as Router from "./RpcRouter.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <HR, E>(
  handler: (u: ReadonlyArray<unknown>) => Effect.Effect<unknown, E, HR>
) =>
<R extends Router.RpcRouter<any, any>>(): RequestResolver.RequestResolver<
  Rpc.Request<Router.RpcRouter.Request<R>>,
  Schema.SerializableWithResult.Context<Router.RpcRouter.Request<R>> | HR
> => {
  const getDecode = withRequestTag((req) => Schema.decodeUnknown(Schema.exitSchema(req)))
  const getDecodeChunk = withRequestTag((req) => Schema.decodeUnknown(Schema.Chunk(Schema.exitSchema(req))))

  return RequestResolver.makeBatched((requests: NonEmptyArray<Rpc.Request<Schema.TaggedRequest.All>>) =>
    pipe(
      Effect.forEach(requests, (_) =>
        Effect.map(
          Schema.serialize(_.request),
          (request) => ({ ..._, request })
        )),
      Effect.flatMap(handler),
      Effect.filterOrDieMessage(
        (_): _ is Array<unknown> => Array.isArray(_) && _.length === requests.length,
        "@effect/rpc: handler must return an array of responses with the same length as the requests."
      ),
      Effect.flatMap(Effect.forEach((response, index) => {
        const request = requests[index]
        if (StreamRequestTypeId in request.request) {
          return pipe(
            getDecodeChunk(request.request)(response),
            Effect.orDie,
            Effect.matchCauseEffect({
              onFailure: (cause) => Request.succeed(request, Stream.failCause(cause)),
              onSuccess: (chunk) => {
                const lastExit = Chunk.unsafeLast(chunk)
                const channel = Exit.match(lastExit, {
                  onFailure: (cause) =>
                    chunk.length > 1 ?
                      Channel.zipRight(
                        Channel.write(Chunk.map(
                          Chunk.dropRight(chunk, 1),
                          (exit) => (exit as Exit.Success<any, any>).value
                        )),
                        Channel.failCause(cause)
                      ) :
                      Channel.failCause(cause),
                  onSuccess: (_) => Channel.write(Chunk.map(chunk, (exit) => (exit as Exit.Success<any, any>).value))
                })
                return Request.succeed(request, Stream.fromChannel(channel))
              }
            })
          )
        }
        return Effect.matchCauseEffect(Effect.orDie(getDecode(request.request)(response)), {
          onFailure: (cause) => Request.failCause(request, cause as any),
          onSuccess: (exit) => Request.complete(request, exit as any)
        })
      }, { discard: true })),
      Effect.orDie,
      Effect.catchAllCause((cause) =>
        Effect.forEach(
          requests,
          (request) => Request.failCause(request, cause),
          { discard: true }
        )
      )
    )
  )
}
