/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus fluent ets/Effect reject
 */
export function reject_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => Option<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.rejectEffect((a) => pf(a).map(Effect.failNow))
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus static ets/Effect/Aspects reject
 */
export const reject = Pipeable(reject_)
