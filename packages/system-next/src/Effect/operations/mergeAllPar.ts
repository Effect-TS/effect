// ets_tracing: off

import type { Effect } from "../definition"
import { chain, chain_ } from "./chain"
import * as Ref from "./excl-deps-ref"
import { forEachParDiscard_ } from "./excl-forEach"

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export function mergeAllPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
) {
  return chain_(
    Ref.make(zero),
    (acc) =>
      chain_(
        forEachParDiscard_(
          as,
          chain((a) => Ref.update_(acc, (b) => f(b, a)))
        ),
        () => Ref.get(acc)
      ),
    __trace
  )
}

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @ets_data_first mergeAllPar_
 */
export function mergeAllPar<A, B>(zero: B, f: (b: B, a: A) => B, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAllPar_(as, zero, f, __trace)
}
