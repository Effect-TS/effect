import * as Cause from "effect/Cause"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type * as Error from "../../Http/ServerError.js"

/** @internal */
export const TypeId: Error.TypeId = Symbol.for(
  "@effect/platform/Http/Error"
) as Error.TypeId

/** @internal */
export const isServerError = (u: unknown): u is Error.HttpServerError => Predicate.hasProperty(u, TypeId)

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
