import { concreteSynchronizedRef } from "@effect/core/io/Ref/Synchronized/operations/_internal/SynchronizedRefInternal";

/**
 * Writes a new value to the `Ref.Synchronized`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @tsplus fluent ets/Ref/Synchronized set
 */
export function set_<A>(
  self: SynchronizedRef<A>,
  value: A,
  __tsplusTrace?: string
): UIO<void> {
  concreteSynchronizedRef(self);
  return self.semaphore.withPermit(self.ref.set(value));
}

/**
 * Writes a new value to the `Ref.Synchronized`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @tsplus static ets/Ref/Synchronized/Aspects set
 */
export const set = Pipeable(set_);
