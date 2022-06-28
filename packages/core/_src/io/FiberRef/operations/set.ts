/**
 * Sets the value associated with the current fiber.
 *
 * @tsplus fluent effect/core/io/FiberRef set
 */
export function set_<A, P>(
  self: FiberRef<A, P>,
  value: A,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return self.modify(() => Tuple(undefined, value))
}

/**
 * Sets the value associated with the current fiber.
 *
 * @tsplus static effect/core/io/FiberRef.Aspects set
 */
export const set = Pipeable(set_)
