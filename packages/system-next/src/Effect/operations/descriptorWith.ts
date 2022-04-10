import type * as Fiber from "../../Fiber"
import type { Effect } from "../definition"
import { IDescriptor } from "../definition"

/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 */
export function descriptorWith<R, E, A>(
  f: (descriptor: Fiber.Descriptor) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IDescriptor(f, __trace)
}
