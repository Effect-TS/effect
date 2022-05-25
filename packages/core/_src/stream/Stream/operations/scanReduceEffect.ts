/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results.
 *
 * @tsplus fluent ets/Stream scanReduceEffect
 */
export function scanReduceEffect_<R, E, A, R2, E2, A2 extends A>(
  self: Stream<R, E, A>,
  f: (a2: A2, a: A) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return self.mapAccumEffect(
    Option.emptyOf<A2>(),
    (option: Option<A2>, a) =>
      option.fold(
        Effect.succeedNow(Tuple(Option.some(a as A2), a as A2)),
        (a2) => f(a2, a).map((a2) => Tuple(Option.some(a2), a2))
      )
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results.
 *
 * @tsplus static ets/Stream/Aspects scanReduceEffect
 */
export const scanReduceEffect = Pipeable(scanReduceEffect_)
