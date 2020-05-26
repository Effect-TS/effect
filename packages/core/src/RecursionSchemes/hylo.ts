import { URIS } from "../Base"
import * as T from "../Effect"

import { Coalgebra } from "./ana"
import { Algebra } from "./cata"
import { FunctorM } from "./functor"

export function hylo<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <S1, S2, R1, R2, E1, E2, A, B>(
  alg: Algebra<F, S1, R1, E1, B>,
  coalg: Coalgebra<F, S2, R2, E2, A>
) => (a: A) => T.Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, B>
export function hylo<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <A, B>(
  alg: Algebra<F, S, R, E, B>,
  coalg: Coalgebra<F, S, R, E, A>
) => (a: A) => T.Effect<S, R, E, B> {
  return (alg, coalg) => (a) =>
    T.chain_(
      T.chain_(coalg(a), (x) => T.suspended(() => F(x, (y) => hylo(F)(alg, coalg)(y)))),
      alg
    )
}
