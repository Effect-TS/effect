import { isEither } from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Request from "@effect/io/Request"
import * as Resolver from "@effect/io/RequestResolver"
import type { RpcDecodeFailure, RpcTransportError } from "@effect/rpc/Error"
import type * as resolver from "@effect/rpc/Resolver"
import * as PR from "@effect/schema/ParseResult"

/** @internal */
export const RpcRequest = Request.of<resolver.RpcRequest>()

/** @internal */
export const make = <R>(
  send: (
    requests: ReadonlyArray<resolver.RpcRequest>,
  ) => Effect.Effect<R, RpcTransportError, ReadonlyArray<unknown>>,
): resolver.RpcResolver<R> =>
  Resolver.makeBatched<resolver.RpcRequest>()((requests) =>
    pipe(
      send(requests),
      Effect.filterOrFail(
        (_): _ is ReadonlyArray<resolver.RpcResponse> =>
          Array.isArray(_) && _.length === requests.length && isEither(_[0]),
        (): RpcDecodeFailure => ({
          _tag: "RpcDecodeFailure",
          errors: [PR.unexpected(requests)],
        }),
      ),
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
