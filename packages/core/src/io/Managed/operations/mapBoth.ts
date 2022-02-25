import type { Managed } from "../definition"

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus fluent ets/Managed mapBoth
 */
export function mapBoth_<R, E, A, E2, B>(
  self: Managed<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => B,
  __tsplusTrace?: string
): Managed<R, E2, B> {
  return self.mapError(f).map(g)
}

export function mapBoth<E, E2, A, B>(
  f: (e: E) => E2,
  g: (a: A) => B,
  __tsplusTrace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R, E2, B> => mapBoth_(self, f, g)
}
