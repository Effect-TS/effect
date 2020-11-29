import { traceAs } from "@effect-ts/tracing-utils"

import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R2, E2, A2, B>(
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) {
  return <R, E>(a: Effect<R, E, A>): Effect<R & R2, E | E2, B> => zipWith_(a, b, f)
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
): Effect<R & R2, E | E2, B> {
  return chain_(
    a,
    traceAs(f, (ra) => map_(b, (rb) => f(ra, rb)))
  )
}
