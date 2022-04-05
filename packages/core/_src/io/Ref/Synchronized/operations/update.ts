/**
 * Atomically modifies the `Ref.Synchronized` with the specified function.
 *
 * @tsplus fluent ets/Ref/Synchronized update
 */
export function update_<A>(
  self: SynchronizedRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<void> {
  return (self as Ref<A>).update(f);
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects update
 */
export const update = Pipeable(update_);
