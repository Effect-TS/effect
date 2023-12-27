import * as Data from "effect/Data"
import type * as Error from "../Error.js"

/** @internal */
export const PlatformErrorTypeId: Error.PlatformErrorTypeId = Symbol.for(
  "@effect/platform/Error/PlatformErrorTypeId"
) as Error.PlatformErrorTypeId

const make =
  <A extends Error.PlatformError>(tag: A["_tag"]) => (props: Omit<A, Error.PlatformError.ProvidedFields>): A =>
    Data.struct({
      [PlatformErrorTypeId]: PlatformErrorTypeId,
      _tag: tag,
      ...props
    } as A)

/** @internal */
export const badArgument = make<Error.BadArgument>("BadArgument")

/** @internal */
export const systemError = make<Error.SystemError>("SystemError")
