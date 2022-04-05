/**
 * Atomically writes the specified value to the `Ref.Synchronized`, returning
 * the value immediately before modification.
 *
 * @tsplus fluent ets/Ref/Synchronized getAndSet
 */
export function getAndSet_<A>(
  self: SynchronizedRef<A>,
  value: A,
  __tsplusTrace?: string
): UIO<A> {
  return (self as Ref<A>).getAndSet(value);
}

/**
 * Atomically writes the specified value to the `Ref.Synchronized`, returning
 * the value immediately before modification.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects getAndSet
 */
export const getAndSet = Pipeable(getAndSet_);
