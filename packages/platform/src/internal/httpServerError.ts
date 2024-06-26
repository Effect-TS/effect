import * as Cause from "effect/Cause"
import type * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type * as Error from "../HttpServerError.js"
import type { HttpServerResponse } from "../HttpServerResponse.js"
import * as internalServerResponse from "./httpServerResponse.js"

/** @internal */
export const TypeId: Error.TypeId = Symbol.for(
  "@effect/platform/HttpServerError"
) as Error.TypeId

/** @internal */
export const isServerError = (u: unknown): u is Error.HttpServerError => Predicate.hasProperty(u, TypeId)

/** @internal */
export const clientAbortFiberId = globalValue(
  "@effect/platform/HttpServerError/clientAbortFiberId",
  () => FiberId.runtime(-499, 0)
)

/** @internal */
export const isClientAbortCause = <E>(cause: Cause.Cause<E>): boolean =>
  Cause.reduce(
    cause,
    false,
    (_, cause) => cause._tag === "Interrupt" && cause.fiberId === clientAbortFiberId ? Option.some(true) : Option.none()
  )

/** @internal */
export const causeStatusStripped = <E>(
  cause: Cause.Cause<E>
): readonly [status: number, cause: Option.Option<Cause.Cause<E>>] => {
  if (Cause.isInterruptedOnly(cause)) {
    return [isClientAbortCause(cause) ? 499 : 503, Option.some(cause)]
  }
  let response: HttpServerResponse | undefined
  const stripped = Cause.stripSomeDefects(cause, (defect) => {
    if (internalServerResponse.isServerResponse(defect)) {
      response = defect
      return Option.some(Cause.die(defect))
    }
    return Option.none()
  })
  return [response?.status ?? 500, stripped]
}

const internalServerError = internalServerResponse.empty({ status: 500 })

/** @internal */
export const exitResponse = <E>(exit: Exit.Exit<HttpServerResponse, E>): HttpServerResponse => {
  if (exit._tag === "Success") {
    return exit.value
  }
  return Cause.reduce(
    exit.cause,
    internalServerError,
    (_, cause) =>
      cause._tag === "Die" && internalServerResponse.isServerResponse(cause.defect)
        ? Option.some(cause.defect)
        : Option.none()
  )
}
