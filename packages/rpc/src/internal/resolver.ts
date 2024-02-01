import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Request from "effect/Request"
import * as Resolver from "effect/RequestResolver"
import type { RpcError, RpcTransportError } from "../Error.js"
import type * as resolver from "../Resolver.js"
import * as Codec from "./codec.js"

const requestProto: Request.Request<any, any> = {
  [Request.RequestTypeId]: {
    _E: (_: never) => _,
    _A: (_: never) => _
  },
  [Hash.symbol](this: resolver.RpcRequest) {
    return this.hash
  },
  [Equal.symbol](this: resolver.RpcRequest, that: Equal.Equal) {
    return this.hash === (that as resolver.RpcRequest).hash
  }
}

/** @internal */
export const requestHash = (
  method: string,
  inputHash: number,
  spanPrefix: string
): number =>
  pipe(
    Hash.string(method),
    Hash.combine(Hash.string(spanPrefix)),
    Hash.combine(inputHash),
    Hash.optimize
  )

/** @internal */
export const RpcRequest: Request.Request.Constructor<
  resolver.RpcRequest,
  never
> = function(args) {
  return Object.setPrototypeOf(args, requestProto)
}

const RpcResponse: Schema.Schema<resolver.RpcResponse> = Schema.union(
  Schema.struct({
    _tag: Schema.literal("Success"),
    value: Schema.unknown
  }),
  Schema.struct({
    _tag: Schema.literal("Error"),
    error: Schema.unknown as Schema.Schema<RpcError>
  })
)

const decodeResponse = Codec.decode(RpcResponse)
const decodeResponses = Codec.decode(Schema.array(RpcResponse))

/** @internal */
export const makeWithSchema = <R>(
  send: (
    requests: ReadonlyArray<resolver.RpcRequest>
  ) => Effect.Effect<R, RpcTransportError, unknown>
): resolver.RpcResolver<R> =>
  Resolver.makeBatched<R, resolver.RpcRequest>((requests) =>
    pipe(
      send(requests),
      Effect.flatMap(decodeResponses),
      Effect.flatMap((responses) =>
        Effect.forEach(requests, (request, index) => {
          const response = responses[index]
          return Request.complete(
            request,
            response._tag === "Success"
              ? Exit.succeed(response.value)
              : Exit.fail(response.error)
          )
        })
      ),
      Effect.catchAll((_) =>
        Effect.forEach(requests, (request) => Request.fail(request, _), {
          discard: true
        })
      )
    )
  )

/** @internal */
export const make = <R>(
  send: (
    requests: ReadonlyArray<resolver.RpcRequest.Payload>
  ) => Effect.Effect<R, RpcTransportError, unknown>
): resolver.RpcResolver<R> => makeWithSchema((requests) => send(requests.map((_) => _.payload)))

/** @internal */
export const makeSingleWithSchema = <R>(
  send: (
    request: resolver.RpcRequest
  ) => Effect.Effect<R, RpcTransportError, unknown>
): resolver.RpcResolver<R> =>
  Resolver.fromEffect<R, resolver.RpcRequest>((request) =>
    pipe(
      send(request),
      Effect.flatMap(decodeResponse),
      Effect.flatMap((response) =>
        response._tag === "Success"
          ? Effect.succeed(response.value)
          : Effect.fail(response.error)
      )
    )
  )

/** @internal */
export const makeSingle = <R>(
  send: (
    request: resolver.RpcRequest.Payload
  ) => Effect.Effect<R, RpcTransportError, unknown>
): resolver.RpcResolver<R> => makeSingleWithSchema((request) => send(request.payload))
