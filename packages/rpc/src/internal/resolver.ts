import { pipe } from "@effect/data/Function"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Request from "@effect/io/Request"
import * as Resolver from "@effect/io/RequestResolver"
import type { RpcError, RpcTransportError } from "@effect/rpc/Error"
import type * as resolver from "@effect/rpc/Resolver"
import { decodeEffect } from "@effect/rpc/internal/codec"
import * as Schema from "@effect/schema/Schema"
import * as Exit from "@effect/io/Exit"

/** @internal */
export const RpcRequest = Request.of<resolver.RpcRequest>()

const RpcResponse: Schema.Schema<resolver.RpcResponse> = Schema.union(
  Schema.struct({
    _tag: Schema.literal("Success"),
    value: Schema.unknown,
  }),
  Schema.struct({
    _tag: Schema.literal("Error"),
    error: Schema.unknown as Schema.Schema<RpcError>,
  }),
)

const decodeResponses = decodeEffect(Schema.array(RpcResponse))

/** @internal */
export const make = <R>(
  send: (
    requests: ReadonlyArray<resolver.RpcRequest>,
  ) => Effect.Effect<R, RpcTransportError, unknown>,
): resolver.RpcResolver<R> =>
  Resolver.makeBatched<resolver.RpcRequest>()((requests) =>
    pipe(
      send(requests),
      Effect.flatMap(decodeResponses),
      Effect.flatMap((responses) =>
        Effect.allDiscard(
          ReadonlyArray.zipWith(requests, responses, (request, response) =>
            Request.complete(
              request,
              response._tag === "Success"
                ? Exit.succeed(response.value)
                : Exit.fail(response.error),
            ),
          ),
        ),
      ),
      Effect.catchAll((_) =>
        Effect.allDiscard(requests.map((request) => Request.fail(request, _))),
      ),
    ),
  )
