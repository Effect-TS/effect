// ets_tracing: off

import * as E from "../Either"
import { chain_, succeed, succeedWith } from "./core"
import { fail } from "./fail"

/**
 * Lifts an `Either` into a `Effect` value.
 */
export function fromEither<E, A>(f: () => E.Either<E, A>, __trace?: string) {
  return chain_(succeedWith(f), E.fold(fail, succeed), __trace)
}
