/**
 * Sets the value associated with the current fiber.
 *
 * @tsplus fluent ets/FiberRef set
 */
export function set_<A>(
  self: FiberRef<A>,
  value: A,
  __tsplusTrace?: string
): UIO<void> {
  return self.modify(() => Tuple(undefined, value));
}

/**
 * Sets the value associated with the current fiber.
 *
 * @tsplus static ets/FiberRef/Aspects set
 */
export const set = Pipeable(set_);
