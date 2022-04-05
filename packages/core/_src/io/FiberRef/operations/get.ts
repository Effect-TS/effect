/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 *
 * @tsplus fluent ets/FiberRef get
 */
export function get<A>(self: FiberRef<A>, __tsplusTrace?: string): UIO<A> {
  return self.modify((a) => Tuple(a, a));
}
