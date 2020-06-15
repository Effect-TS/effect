import { pipe } from "../../Function"

import { Exit } from "./exit"
import { map } from "./map"
import { mapError } from "./mapError"

/**
 * Maps over both the error and value type.
 */
export const bimap = <E, E1, A, A1>(f: (e: E) => E1, g: (a: A) => A1) => (
  exit: Exit<E, A>
) => pipe(exit, map(g), mapError(f))
