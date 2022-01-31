// ets_tracing: off

import * as E from "../Either/index.js"
import { chain_, fail, succeed, succeedWith } from "./core.js"

/**
 * Lifts an `Either` into a `Sync` value.
 */
export function fromEither<E, A>(f: () => E.Either<E, A>) {
  return chain_(succeedWith(f), E.fold(fail, succeed))
}
