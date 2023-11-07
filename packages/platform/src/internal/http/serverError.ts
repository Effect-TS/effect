import * as Data from "effect/Data"
import type * as Error from "../../Http/ServerError.js"

/** @internal */
export const TypeId: Error.TypeId = Symbol.for(
  "@effect/platform/Http/Error"
) as Error.TypeId

const make = <A extends Error.HttpServerError>(tag: A["_tag"]) => (props: Omit<A, Error.HttpError.ProvidedFields>): A =>
  Data.struct({
    [TypeId]: TypeId,
    _tag: tag,
    ...props
  } as A)

/** @internal */
export const requestError = make<Error.RequestError>("RequestError")

/** @internal */
export const responseError = make<Error.ResponseError>("ResponseError")

/** @internal */
export const routeNotFound = make<Error.RouteNotFound>("RouteNotFound")

/** @internal */
export const serveError = make<Error.ServeError>("ServeError")
