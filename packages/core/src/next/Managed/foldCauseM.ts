import { pipe } from "../../Function"
import { Cause } from "../Cause/cause"

import * as T from "./deps"
import { Managed } from "./managed"

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  f: (cause: Cause<E>) => Managed<S1, R1, E1, A1>,
  g: (a: A) => Managed<S2, R2, E2, A2>
) => <S, R>(self: Managed<S, R, E, A>) => foldCauseM_(self, f, g)

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <S, R, E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  self: Managed<S, R, E, A>,
  f: (cause: Cause<E>) => Managed<S1, R1, E1, A1>,
  g: (a: A) => Managed<S2, R2, E2, A2>
) =>
  new Managed<S | S1 | S2, R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      self.effect,
      T.foldCauseM(
        (c) => f(c).effect,
        ([_, a]) => g(a).effect
      )
    )
  )
