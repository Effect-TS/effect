import type * as Error from "../../Http/ClientError.js"

/** @internal */
export const TypeId: Error.TypeId = Symbol.for(
  "@effect/platform/Http/Error"
) as Error.TypeId
