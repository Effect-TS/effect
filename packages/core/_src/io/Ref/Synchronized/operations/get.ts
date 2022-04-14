import { concreteSynchronizedRef } from "@effect/core/io/Ref/Synchronized/operations/_internal/SynchronizedRefInternal";

/**
 * Reads the value from the `Ref.Synchronized`.
 *
 * @tsplus fluent ets/Ref/Synchronized get
 */
export function get<A>(self: SynchronizedRef<A>, __tsplusTrace?: string): Effect.UIO<A> {
  concreteSynchronizedRef(self);
  return self.ref.get();
}
