/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 *
 * @tsplus fluent ets/FiberRef getAndSet
 */
export function getAndSet_<A, P>(
  self: FiberRef<A, P>,
  value: A,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => Tuple(v, value));
}

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 *
 * @tsplus static ets/FiberRef/Aspects getAndSet
 */
export const getAndSet = Pipeable(getAndSet_);
