import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Request from "@effect/io/Request"
import * as Resolver from "@effect/io/RequestResolver"
import type { RpcError, RpcTransportError } from "@effect/rpc/Error"
import type * as resolver from "@effect/rpc/Resolver"
import { decodeEffect } from "@effect/rpc/internal/codec"
import * as Schema from "@effect/schema/Schema"

const requestProto: Request.Request<any, any> = {
  [Request.RequestTypeId]: {
    _E: (_: never) => _,
    _A: (_: never) => _,
  },
  [Hash.symbol](this: resolver.RpcRequest) {
    return Hash.structure({
      _tag: this._tag,
      input: this.input,
    })
  },
  [Equal.symbol](this: resolver.RpcRequest, that: resolver.RpcRequest) {
    return (
      Equal.equals(this._tag, that._tag) && Equal.equals(this.input, that.input)
    )
  },
}

/** @internal */
export const RpcRequest: Request.Request.Constructor<
  resolver.RpcRequest,
  never
> = function (args) {
  return Object.setPrototypeOf(args, requestProto)
}

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
  Resolver.makeBatched<R, resolver.RpcRequest>((requests) =>
    pipe(
      send(requests),
      Effect.flatMap(decodeResponses),
      Effect.flatMap((responses) =>
        Effect.forEachWithIndex(requests, (request, index) => {
          const response = responses[index]
          return Request.complete(
            request,
            response._tag === "Success"
              ? Exit.succeed(response.value)
              : Exit.fail(response.error),
          )
        }),
      ),
      Effect.catchAll((_) =>
        Effect.forEachDiscard(requests, (request) => Request.fail(request, _)),
      ),
    ),
  )
