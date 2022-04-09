/**
 * Same as `zip` but discards the output of the right hand side.
 *
 * @tsplus operator ets/Fiber <
 * @tsplus operator ets/RuntimeFiber <
 * @tsplus fluent ets/Fiber zipLeft
 * @tsplus fluent ets/RuntimeFiber zipLeft
 */
export function zipLeft_<E, E1, A, A1>(
  self: Fiber<E, A>,
  that: Fiber<E1, A1>
): Fiber<E | E1, A> {
  return self.zipWith(that, (a, _) => a);
}

/**
 * Same as `zip` but discards the output of the right hand side.
 *
 * @tsplus static ets/Fiber/Aspects zipLeft
 */
export const zipLeft = Pipeable(zipLeft_);
