import * as Iter from "../../Iterable"
import * as O from "../../Option"
import type { Managed } from "../definition"
import { collectAllWithPar_ } from "./collectAllWithPar"
import { exit } from "./exit"

/**
 * Evaluate and run each effect in the structure and collect discarding failed
 * ones.
 */
export function collectAllSuccessesPar<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return collectAllWithPar_(
    Iter.map_(as, (x) => exit(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}
