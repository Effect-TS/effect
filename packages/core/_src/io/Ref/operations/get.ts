import { concreteRef } from "@effect/core/io/Ref/operations/_internal/RefInternal";

/**
 * Reads the value from the `Ref`.
 *
 * @tsplus fluent ets/Ref get
 */
export function get<A>(self: Ref<A>, __tsplusTrace?: string): UIO<A> {
  concreteRef(self);
  return Effect.succeed(self.value.get);
}
