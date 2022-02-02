import { Effect } from "../definition"

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
  __etsTrace?: string
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
 * @ets_data_first mapBoth_
 */
export function mapBoth<E, E2, A, B>(
  f: (e: E) => E2,
  g: (a: A) => B,
  __etsTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R, E2, B> => self.mapBoth(f, g)
}
