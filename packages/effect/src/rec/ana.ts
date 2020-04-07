import { Kind, URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";
import { TMap } from "./cata";
import { Fix } from "./Fix";

export interface Coalgebra<F extends URIS, R, E, A> {
  (_: A): EF.Effect<R, E, Kind<F, A>>;
}

export function ana<R, E, F extends URIS>(
  F: TMap<F, R, E>
): <R2, E2, A>(coalg: Coalgebra<F, R, E, A>) => (_: A) => EF.Effect<R & R2, E | E2, Fix<F>> {
  return (coalg) => (a) =>
    EF.effect.map(
      EF.effect.chain(coalg(a), (x) => EF.flatten(EF.sync(() => F(x, ana(F)(coalg))))),
      (unfix) => ({ unfix })
    );
}
