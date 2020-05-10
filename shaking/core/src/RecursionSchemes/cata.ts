import { Kind, URIS } from "fp-ts/lib/HKT"

import { Effect, effect, suspended } from "../Effect"

import { Fix } from "./Fix"
import { FunctorM } from "./functor"

export interface Algebra<F extends URIS, S, R, E, A> {
  (_: Kind<F, A>): Effect<S, R, E, A>
}

export function algebra<F extends URIS, A>() {
  return <S, R, E>(f: (_: Kind<F, A>) => Effect<S, R, E, A>): Algebra<F, S, R, E, A> =>
    f
}

export function cata<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <S2, R2, E2, A>(
  alg: Algebra<F, S2, R2, E2, A>
) => (_: Fix<F>) => Effect<S | S2, R & R2, E | E2, A>
export function cata<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <A>(alg: Algebra<F, S, R, E, A>) => (_: Fix<F>) => Effect<S, R, E, A> {
  return (alg) => (_) =>
    effect.chain(
      suspended(() => F(_.unfix, cata(F)(alg))),
      alg
    )
}
