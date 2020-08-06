import * as E from "../../Either"

import { chain_, effectTotal, succeed } from "./core"
import { fail } from "./fail"

/**
 * Lifts an `Either` into a `Effect` value.
 */
export const fromEither = <E, A>(f: () => E.Either<E, A>) =>
  chain_(effectTotal(f), E.fold(fail, succeed))
