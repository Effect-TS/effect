import { Kind, URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";
import { Fix } from "./Fix";
import { FunctorM } from "./functor";

export interface Algebra<F extends URIS, S, R, E, A> {
  (_: Kind<F, A>): EF.Effect<S, R, E, A>;
}

export function cata<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <S2, R2, E2, A>(
  alg: Algebra<F, S2, R2, E2, A>
) => (_: Fix<F>) => EF.Effect<S | S2, R & R2, E | E2, A>;
export function cata<S, R, E, F extends URIS>(
  F: FunctorM<F, S, R, E>
): <A>(alg: Algebra<F, S, R, E, A>) => (_: Fix<F>) => EF.Effect<S, R, E, A> {
  return (alg) => (_) =>
    EF.effect.chain(
      EF.suspended(() => F(_.unfix, cata(F)(alg))),
      alg
    );
}
