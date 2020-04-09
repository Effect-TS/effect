import { URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";
import { Coalgebra } from "./ana";
import { Algebra } from "./cata";
import { TMap } from "./TMap";

export function hylo<R, E, F extends URIS>(
  F: TMap<F, R, E>
): <R1, R2, E1, E2, A, B>(
  alg: Algebra<F, R1, E1, B>,
  coalg: Coalgebra<F, R2, E2, A>
) => (a: A) => EF.Effect<R & R1 & R2, E | E1 | E2, B> {
  return (alg, coalg) => (a) =>
    EF.effect.chain(
      EF.effect.chain(coalg(a), (x) => F(x, (m) => hylo(F)(alg, coalg)(m) as any)),
      alg as any
    );
}
