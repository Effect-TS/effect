import type { Either } from "../../data/Either"
import { chain_, fail, succeed, succeedWith } from "./core"

/**
 * Lifts an `Either` into a `Sync` value.
 */
export function fromEither<E, A>(f: () => Either<E, A>) {
  return chain_(succeedWith(f), (_) => _.fold(fail, succeed))
}
