// ets_tracing: off

import * as fe from "../../Effect/fromEither.js"
import * as E from "../../Either/index.js"
import { fromEffect } from "../fromEffect.js"

/**
 * Lifts an `Either` into a `Managed` value.
 */
export function fromEitherWith<E, A>(self: () => E.Either<E, A>, __trace?: string) {
  return fromEffect(fe.fromEither(self), __trace)
}

/**
 * Lifts an `Either` into a `Managed` value.
 */
export function fromEither<E, A>(self: E.Either<E, A>, __trace?: string) {
  return fromEffect(
    fe.fromEither(() => self),
    __trace
  )
}
