/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus fluent ets/Effect mapBoth
 */
export function mapBoth_<R, E, A, E2, B>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => B,
  __tsplusTrace?: string
): Effect<R, E2, B> {
  return self.foldEffect(
    (e) => Effect.failNow(f(e)),
    (a) => Effect.succeedNow(g(a))
  )
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus static ets/Effect/Aspects mapBoth
 */
export const mapBoth = Pipeable(mapBoth_)
