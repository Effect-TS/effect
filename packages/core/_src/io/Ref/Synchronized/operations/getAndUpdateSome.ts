/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 *
 * @tsplus fluent ets/Ref/Synchronized getAndUpdateSome
 */
export function getAndUpdateSome_<A>(
  self: SynchronizedRef<A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<A> {
  return (self as Ref<A>).getAndUpdateSome(pf);
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects getAndUpdateSome
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_);
