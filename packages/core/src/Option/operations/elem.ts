// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Equal } from "../../Equal/index.js"

/**
 * Returns `true` if `ma` contains `a`
 *
 * @ets_data_first elem_
 */
export function elem<A>(E: Equal<A>): (a: A) => (ma: O.Option<A>) => boolean {
  const el = elem_(E)
  return (a) => (ma) => el(ma, a)
}

/**
 * Returns `true` if `ma` contains `a`
 */
export function elem_<A>(E: Equal<A>): (ma: O.Option<A>, a: A) => boolean {
  return (ma, a) => (O.isNone(ma) ? false : E.equals(a, ma.value))
}
