import { Kind, URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";
import { Fix } from "./Fix";
import { TMap } from "./TMap";

export interface Algebra<F extends URIS, R, E, A> {
  (_: Kind<F, A>): EF.Effect<R, E, A>;
}

export function cata<R, E, F extends URIS>(
  F: TMap<F, R, E>
): <R2, E2, A>(alg: Algebra<F, R2, E2, A>) => (_: Fix<F>) => EF.Effect<R & R2, E | E2, A>;
export function cata<R, E, F extends URIS>(
  F: TMap<F, R, E>
): <A>(alg: Algebra<F, R, E, A>) => (_: Fix<F>) => EF.Effect<R, E, A> {
  return (alg) => (_) =>
    EF.effect.chain(
      EF.suspended(() => F(_.unfix, cata(F)(alg))),
      alg
    );
}
