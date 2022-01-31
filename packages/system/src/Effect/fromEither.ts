// ets_tracing: off

import * as E from "../Either/index.js"
import { chain_, succeed, succeedWith } from "./core.js"
import { fail } from "./fail.js"

/**
 * Lifts an `Either` into a `Effect` value.
 */
export function fromEither<E, A>(f: () => E.Either<E, A>, __trace?: string) {
  return chain_(succeedWith(f), E.fold(fail, succeed), __trace)
}
