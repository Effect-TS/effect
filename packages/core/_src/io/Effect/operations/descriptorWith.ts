import { IDescriptor } from "@effect/core/io/Effect/definition/primitives"

/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 *
 * @tsplus static ets/Effect/Ops descriptorWith
 */
export function descriptorWith<R, E, A>(
  f: (descriptor: Fiber.Descriptor) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return new IDescriptor(f, __tsplusTrace)
}
