import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type * as Error from "../HttpServerError.js"
import * as Respondable from "../HttpServerRespondable.js"
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
export const causeResponse = <E>(
  cause: Cause.Cause<E>
): Effect.Effect<readonly [HttpServerResponse, Cause.Cause<E>]> => {
  const [effect, stripped] = Cause.reduce(
    cause,
    [Effect.succeed(internalServerError), Cause.empty as Cause.Cause<E>] as const,
    (acc, cause) => {
      const withoutInterrupt = Cause.isInterruptType(acc[1]) ? Cause.empty : acc[1]
      switch (cause._tag) {
        case "Fail": {
          return Option.some(
            [
              Respondable.toResponseOrElse(cause.error, internalServerError),
              combineCauses(withoutInterrupt, cause)
            ] as const
          )
        }
        case "Die": {
          const isResponse = internalServerResponse.isServerResponse(cause.defect)
          return Option.some(
            [
              Respondable.toResponseOrElseDefect(cause.defect, internalServerError),
              isResponse ? withoutInterrupt : combineCauses(withoutInterrupt, cause)
            ] as const
          )
        }
        case "Interrupt": {
          if (acc[1]._tag !== "Empty") {
            return Option.none()
          }
          const response = cause.fiberId === clientAbortFiberId ? clientAbortError : serverAbortError
          return Option.some([Effect.succeed(response), cause] as const)
        }
        default: {
          return Option.none()
        }
      }
    }
  )
  return Effect.map(effect, (response) => {
    if (Cause.isEmptyType(stripped)) {
      return [response, Cause.empty] as const
    }
    return [response, Cause.sequential(stripped, Cause.die(response))] as const
  })
}

const combineCauses = <A = never, B = never>(left: Cause.Cause<A>, right: Cause.Cause<B>): Cause.Cause<A | B> => {
  if (Cause.isEmptyType(left)) {
    return right
  } else if (Cause.isEmptyType(right)) {
    return left
  }
  return Cause.sequential(left, right)
}

/** @internal */
export const causeResponseStripped = <E>(
  cause: Cause.Cause<E>
): readonly [response: HttpServerResponse, cause: Option.Option<Cause.Cause<E>>] => {
  let response: HttpServerResponse | undefined
  const stripped = Cause.stripSomeDefects(cause, (defect) => {
    if (internalServerResponse.isServerResponse(defect)) {
      response = defect
      return Option.some(Cause.empty)
    }
    return Option.none()
  })
  return [response ?? internalServerError, stripped]
}

const internalServerError = internalServerResponse.empty({ status: 500 })
const clientAbortError = internalServerResponse.empty({ status: 499 })
const serverAbortError = internalServerResponse.empty({ status: 503 })

/** @internal */
export const exitResponse = <E>(exit: Exit.Exit<HttpServerResponse, E>): HttpServerResponse => {
  if (exit._tag === "Success") {
    return exit.value
  }
  return causeResponseStripped(exit.cause)[0]
}
