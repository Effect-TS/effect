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
 * @tsplus static ets/EffectOps mergeAllPar
 */
export function mergeAllPar<R, E, A, B>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B,
  __etsTrace?: string
): Effect<R, E, B> {
  return make(zero).flatMap((acc) =>
    Effect.forEachParDiscard(as, (effect) =>
      effect.flatMap((a) => update_(acc, (b) => f(b, a)))
    ).flatMap(() => get(acc))
  )
}
