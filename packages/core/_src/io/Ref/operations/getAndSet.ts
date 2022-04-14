/**
 * Atomically writes the specified value to the `Ref`, returning the value
 * immediately before modification.
 *
 * @tsplus fluent ets/Ref getAndSet
 */
export function getAndSet_<A>(self: Ref<A>, value: A, __tsplusTrace?: string): Effect.UIO<A> {
  return self.modify((v) => Tuple(v, value));
}

/**
 * Atomically writes the specified value to the `Ref`, returning the value
 * immediately before modification.
 *
 * @tsplus static ets/Ref/Aspects getAndSet
 */
export const getAndSet = Pipeable(getAndSet_);
