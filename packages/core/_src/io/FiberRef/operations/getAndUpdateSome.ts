/**
 * Atomically modifies the `XFiberRef` with the specified function and returns
 * the old value. If the function is `None` for the current value it doesn't
 * change it.
 *
 * @tsplus fluent ets/FiberRef getAndUpdateSome
 */
export function getAndUpdateSome_<A, P>(
  self: FiberRef<A, P>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => Tuple(v, pf(v).getOrElse(v)));
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and returns
 * the old value. If the function is `None` for the current value it doesn't
 * change it.
 *
 * @tsplus static ets/FiberRef/Aspects getAndUpdateSome
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_);
