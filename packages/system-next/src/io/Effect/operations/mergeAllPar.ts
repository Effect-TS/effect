import type { LazyArg } from "../../../data/Function"
import { get } from "../../Ref/operations/get"
import { make } from "../../Ref/operations/make"
import { update_ } from "../../Ref/operations/update"
import { Effect } from "../definition"

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
 * @ets static ets/EffectOps mergeAllPar
 */
export function mergeAllPar_<R, E, A, B>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B,
  __etsTrace?: string
) {
  return make(zero).flatMap((acc) =>
    Effect.forEachParDiscard(as, (_) =>
      _.flatMap((a) => update_(acc, (b) => f(b, a)))
    ).flatMap(() => get(acc))
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
export function mergeAllPar<A, B>(zero: B, f: (b: B, a: A) => B, __etsTrace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAllPar_(as, zero, f, __etsTrace)
}
