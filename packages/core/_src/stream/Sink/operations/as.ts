/**
 * Replaces this sink's result with the provided value.
 *
 * @tsplus fluent ets/Sink as
 */
export function as_<R, E, In, L, Z, Z2>(
  self: Sink<R, E, In, L, Z>,
  a: LazyArg<Z2>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z2> {
  return self.map(a);
}

/**
 * Replaces this sink's result with the provided value.
 *
 * @tsplus static ets/Sink/Aspects as
 */
export const as = Pipeable(as_);
