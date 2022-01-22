// ets_tracing: off

import { constant } from "../../Function/index.js"
import type { Any } from "../Any/index.js"
import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"

export function succeedF<F extends HKT.HKT>(
  F_: Covariant<F> & Any<F>
): <A, R = unknown, E = never>(a: A) => HKT.Kind<F, R, E, A> {
  return <A>(a: A) => F_.map(constant(a))(F_.any())
}
