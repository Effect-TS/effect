import type * as Error from "../HttpClientError.js"

/** @internal */
export const TypeId: Error.TypeId = Symbol.for(
  "@effect/platform/HttpClientError"
) as Error.TypeId
