import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"

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
export const StreamRequestTypeId = Symbol.for("@effect/rpc/Rpc/StreamRequest")
