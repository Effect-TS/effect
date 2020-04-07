import { URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";
import { ana, Coalgebra } from "./ana";
import { Algebra, cata } from "./cata";
import { TMap } from "./TMap";

export function hylo<R, E, F extends URIS>(
  F: TMap<F, R, E>
): <R1, R2, E1, E2, A, B>(
  alg: Algebra<F, R1, E1, B>,
  coalg: Coalgebra<F, R2, E2, A>
) => (a: A) => EF.Effect<R & R2 & R1, E | E1 | E2, B> {
  return (alg, coalg) => (a) => EF.effect.chain(ana(F)(coalg)(a), cata(F)(alg));
}
