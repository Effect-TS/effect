import { concreteRef } from "@effect/core/io/Ref/operations/_internal/RefInternal"

/**
 * Writes a new value to the `Ref`, with a guarantee of immediate consistency
 * (at some cost to performance).
 *
 * @tsplus fluent ets/Ref set
 */
export function set_<A>(self: Ref<A>, value: A, __tsplusTrace?: string): Effect<never, never, void> {
  concreteRef(self)
  return Effect.succeed(self.value.set(value))
}

/**
 * Writes a new value to the `Ref`, with a guarantee of immediate consistency
 * (at some cost to performance).
 *
 * @tsplus static ets/Ref/Aspects set
 */
export const set = Pipeable(set_)
