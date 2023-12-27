import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
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
export const isServerError = (u: unknown): u is Error.HttpServerError => Predicate.hasProperty(u, TypeId)

/** @internal */
export const requestError = make<Error.RequestError>("RequestError")

/** @internal */
export const responseError = make<Error.ResponseError>("ResponseError")

/** @internal */
export const routeNotFound = make<Error.RouteNotFound>("RouteNotFound")

/** @internal */
export const serveError = make<Error.ServeError>("ServeError")

/** @internal */
export const clientAbortFiberId = globalValue(
  "@effect/platform/Http/ServerError/clientAbortFiberId",
  () => FiberId.runtime(-499, 0)
)

/** @internal */
export const isClientAbortCause = <E>(cause: Cause.Cause<E>): boolean =>
  Cause.reduce(
    cause,
    false,
    (_, cause) => cause._tag === "Interrupt" && cause.fiberId === clientAbortFiberId ? Option.some(true) : Option.none()
  )
