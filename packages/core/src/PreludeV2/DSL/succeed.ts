// ets_tracing: off

import { constant } from "../../Function"
import type { Any } from "../Any"
import type { Covariant } from "../Covariant"
import type * as HKT from "../HKT"

export function succeedF<F extends HKT.HKT>(
  F_: Covariant<F>,
  A_: Any<F>
): <A, X = any, I = unknown, R = unknown, E = never>(
  a: A
) => HKT.Kind<F, X, I, R, E, A> {
  return <A>(a: A) => F_.map(constant(a))(A_.any())
}
