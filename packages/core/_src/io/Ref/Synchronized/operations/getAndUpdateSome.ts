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
): Effect.UIO<A> {
  return self.modify(v => Tuple(v, pf(v).getOrElse(v)));
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects getAndUpdateSome
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_);
