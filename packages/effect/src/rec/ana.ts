import { Kind, URIS } from "fp-ts/lib/HKT"

import * as EF from "../effect"

import { Fix } from "./Fix"
import { FunctorM } from "./functor"

export interface Coalgebra<F extends URIS, S, R, E, A> {
  (_: A): EF.Effect<S, R, E, Kind<F, A>>
}

export function coalgebra<F extends URIS, A>() {
  return <S, R, E>(
    f: (_: A) => EF.Effect<S, R, E, Kind<F, A>>
  ): Coalgebra<F, S, R, E, A> => f
}

export function ana<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <S2, R2, E2, A>(
  coalg: Coalgebra<F, S2, R2, E2, A>
) => (_: A) => EF.Effect<S | S2, R & R2, E | E2, Fix<F>>
export function ana<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <S2, A>(
  coalg: Coalgebra<F, S, R, E, A>
) => (_: A) => EF.Effect<S | S2, R, E, Fix<F>> {
  return (coalg) => (a) =>
    EF.effect.map(
      EF.effect.chain(coalg(a), (x) =>
        EF.suspended(() => F(x, (y) => ana(F)(coalg)(y)))
      ),
      (unfix) => ({ unfix })
    )
}
