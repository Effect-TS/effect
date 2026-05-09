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
  let effect: Effect.Effect<HttpServerResponse> = Effect.succeed(internalServerError)
  let stripped: Cause.Cause<E> = Cause.empty as Cause.Cause<E>
  let isClientInterrupt = false
  let hasResponse = false

  Cause.reduce(cause, void 0 as void, (_, current) => {
    const withoutInterrupt = Cause.isInterruptType(stripped) ? Cause.empty : stripped
    switch (current._tag) {
      case "Fail": {
        effect = Respondable.toResponseOrElse(current.error, internalServerError)
        stripped = combineCauses(withoutInterrupt, current)
        break
      }
      case "Die": {
        const isResponse = internalServerResponse.isServerResponse(current.defect)
        effect = Respondable.toResponseOrElseDefect(current.defect, internalServerError)
        stripped = isResponse ? withoutInterrupt : combineCauses(withoutInterrupt, current)
        hasResponse = hasResponse || isResponse
        break
      }
      case "Interrupt": {
        isClientInterrupt = isClientInterrupt || current.fiberId === clientAbortFiberId
        if (Cause.isEmptyType(stripped) && !hasResponse) {
          stripped = current
        }
        break
      }
    }
    return Option.none()
  })

  const responseEffect = !hasResponse && Cause.isInterruptType(stripped)
    ? Effect.succeed(isClientInterrupt ? clientAbortError : serverAbortError)
    : effect
  const strippedCause: Cause.Cause<E> = !hasResponse && Cause.isInterruptType(stripped) && isClientInterrupt
    ? Cause.interrupt(clientAbortFiberId) as Cause.Cause<E>
    : stripped

  return Effect.map(responseEffect, (response) => {
    if (Cause.isEmptyType(strippedCause)) {
      return [response, Cause.empty] as const
    }
    return [response, Cause.sequential(strippedCause, Cause.die(response))] as const
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
