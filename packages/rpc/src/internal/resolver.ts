import { Either } from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Request from "@effect/io/Request"
import * as Resolver from "@effect/io/RequestResolver"
import type { RpcError, RpcTransportError } from "@effect/rpc/Error"
import type * as resolver from "@effect/rpc/Resolver"
import { decodeEffect } from "@effect/rpc/internal/codec"
import * as Schema from "@effect/schema/Schema"

/** @internal */
export const RpcRequest = Request.of<resolver.RpcRequest>()

const decodeResponses = decodeEffect(
  Schema.array(
    Schema.either(Schema.unknown, Schema.unknown) as unknown as Schema.Schema<
      resolver.RpcResponse,
      Either<RpcError, unknown>
    >,
  ),
)

/** @internal */
export const make = <R>(
  send: (
    requests: ReadonlyArray<resolver.RpcRequest>,
  ) => Effect.Effect<R, RpcTransportError, ReadonlyArray<unknown>>,
): resolver.RpcResolver<R> =>
  Resolver.makeBatched<resolver.RpcRequest>()((requests) =>
    pipe(
      send(requests),
      Effect.flatMap(decodeResponses),
      Effect.flatMap((responses) =>
        Effect.allDiscard(
          ReadonlyArray.zipWith(requests, responses, (request, response) =>
            Request.completeEffect(request, response),
          ),
        ),
      ),
      Effect.catchAll((_) =>
        Effect.allDiscard(requests.map((request) => Request.fail(request, _))),
      ),
    ),
  )
