/**
 * Reset the value of a `FiberRef` back to its initial value.
 *
 * @tsplus fluent ets/FiberRef reset
 */
export function reset<A, P>(self: FiberRef<A, P>, __tsplusTrace?: string): UIO<void> {
  return self.set(self.initial());
}
