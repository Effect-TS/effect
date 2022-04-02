// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"

export function chainF<F extends HKT.HKT>(
  F_: Monad<F>
): <R2, E2, A, B>(
  f: (a: A) => HKT.Kind<F, R2, E2, B>
) => <R, E>(fa: HKT.Kind<F, R, E, A>) => HKT.Kind<F, R2 & R, E2 | E, B> {
  return (f) => (x) => pipe(x, F_.map(f), F_.flatten)
}
