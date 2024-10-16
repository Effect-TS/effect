import type * as Headers from "@effect/platform/Headers"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Request from "effect/Request"
import * as Schema from "effect/Schema"
import type * as Rpc from "../Rpc.js"

/** @internal */
export const withRequestTag = <A>(
  f: (
    request: Schema.SerializableWithResult<any, any, any, any, any, any, any, any>
  ) => A
) => {
  const cache = new Map<string, A>()
  return (request: Schema.TaggedRequest.All): A => {
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
export const StreamRequestTypeId: Rpc.StreamRequestTypeId = Symbol.for(
  "@effect/rpc/Rpc/StreamRequest"
) as Rpc.StreamRequestTypeId

/** @internal */
export const makeRequest = <A extends Schema.TaggedRequest.All>(
  options: {
    readonly request: A
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
    readonly headers: Headers.Headers
  }
): Rpc.Request<A> => {
  const isStream = StreamRequestTypeId in options.request
  const hash = Hash.hash(options.request)
  return ({
    ...options,
    [Request.RequestTypeId]: undefined as any,
    [PrimaryKey.symbol]: () => `${options.request._tag}:${hash}`,
    [Schema.symbolWithResult]: {
      success: isStream
        ? Schema.Never
        : Schema.successSchema(options.request as any),
      failure: isStream ? Schema.Never : Schema.failureSchema(options.request as any)
    },
    [Equal.symbol](that: Rpc.Request<A>) {
      return Equal.equals(options.request, that.request)
    },
    [Hash.symbol]() {
      return hash
    }
  } as Rpc.Request<A>)
}
