/**
 * Merges an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @tsplus static ets/Effect/Ops mergeAllPar
 */
export function mergeAllPar<R, E, A, B>(
  as: LazyArg<Collection<Effect<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B,
  __tsplusTrace?: string
): Effect<R, E, B> {
  return Ref.make(zero).flatMap((acc) =>
    Effect.forEachParDiscard(as, (effect) => effect.flatMap((a) => acc.update((b) => f(b, a)))).flatMap(() => acc.get())
  );
}
