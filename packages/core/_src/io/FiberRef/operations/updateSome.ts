/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 *
 * @tsplus fluent ets/FiberRef updateSome
 */
export function updateSome_<A, P>(
  self: FiberRef<A, P>,
  pf: (a: A) => Maybe<A>,
  __tsplusTrace?: string
): Effect.UIO<void> {
  return self.modify((v) => Tuple(undefined, pf(v).getOrElse(v)))
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 *
 * @tsplus static ets/FiberRef/Aspects updateSome
 */
export const updateSome = Pipeable(updateSome_)
