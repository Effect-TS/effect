import * as C from "../Cause"

import { Exit } from "./exit"
import { zipWith_ } from "./zipWith_"

/**
 * Zips this together with the specified result using the combination functions.
 */
export const zipWith = <E, E1, A, B, C>(
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: C.Cause<E>, e1: C.Cause<E1>) => C.Cause<E | E1>
) => (exit: Exit<E, A>): Exit<E | E1, C> => zipWith_(exit, that, f, g)
