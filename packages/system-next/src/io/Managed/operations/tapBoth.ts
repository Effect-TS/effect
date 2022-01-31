import { Managed } from "../definition"

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 *
 * @ets fluent ets/Managed tapBoth
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2, X, Y>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, X>,
  g: (a: A) => Managed<R2, E2, Y>,
  __etsTrace?: string
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return self.foldManaged(
    (e) => f(e).flatMap(() => Managed.failNow(e)),
    (a) => g(a).map(() => a)
  )
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 *
 * @ets_data_first tapBoth_
 */
export function tapBoth<E, A, R1, E1, R2, E2, X, Y>(
  f: (e: E) => Managed<R1, E1, X>,
  g: (a: A) => Managed<R2, E2, Y>,
  __etsTrace?: string
) {
  return <R>(self: Managed<R, E, A>) => tapBoth_(self, f, g)
}
