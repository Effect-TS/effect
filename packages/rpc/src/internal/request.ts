import * as Handler from "@effect/platform/Handler"
import type * as Headers from "@effect/platform/Http/Headers"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Request from "effect/Request"
import type * as RpcReq from "../Request.js"

/** @internal */
export const withRequestTag = <A>(
  f: (
    request: Serializable.SerializableWithResult<any, any, any, any, any, any, any, any>
  ) => A
) => {
  const cache = new Map<string, A>()
  return (request: Schema.TaggedRequest.Any): A => {
    let result = cache.get(request._tag)
    if (result !== undefined) {
      return result
    }
    result = f(request as any)
    cache.set(request._tag, result)
    return result
  }
}

/** @internal */
export const makeRequest = <A extends Schema.TaggedRequest.Any>(
  options: {
    readonly request: A
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
    readonly headers: Headers.Headers
  }
): RpcReq.Request<A> => {
  const isStream = Handler.StreamRequestTypeId in options.request
  const hash = Hash.hash(options.request)
  return ({
    ...options,
    [Request.RequestTypeId]: undefined as any,
    [PrimaryKey.symbol]: () => `${options.request._tag}:${hash}`,
    [Serializable.symbolResult]: {
      Success: isStream
        ? Schema.Never
        : Serializable.successSchema(options.request as any),
      Failure: isStream ? Schema.Never : Serializable.failureSchema(options.request as any)
    },
    [Equal.symbol](that: RpcReq.Request<A>) {
      return Equal.equals(options.request, that.request)
    },
    [Hash.symbol]() {
      return hash
    }
  } as RpcReq.Request<A>)
}
