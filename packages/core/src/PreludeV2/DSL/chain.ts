// ets_tracing: off

import { pipe } from "../../Function"
import type * as HKT from "../HKT"
import type { Monad } from "../Monad"

// @todo(warn): original requires fa to be Kind<R2, E2, A>, not Kind<R, E, A>
export function chainF<F extends HKT.HKT>(
  F_: Monad<F>
): <X, I2, R2, E2, A, B>(
  f: (a: A) => HKT.Kind<F, X, I2, R2, E2, B>
) => <I, R, E>(
  fa: HKT.Kind<F, X, I, R, E, A>
) => HKT.Kind<F, X, I2 & I, R2 & R, E2 | E, B> {
  return (f) => (x) => pipe(x, F_.map(f), F_.flatten)
}
