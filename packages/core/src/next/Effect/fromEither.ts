import * as E from "../../Either"

import { chain_ } from "./chain_"
import { effectTotal } from "./effectTotal"
import { fail } from "./fail"
import { succeedNow } from "./succeedNow"

/**
 * Lifts an `Either` into a `Effect` value.
 */
export const fromEither = <E, A>(f: () => E.Either<E, A>) =>
  chain_(effectTotal(f), E.fold(fail, succeedNow))
