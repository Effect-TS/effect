/**
 * Filter the input of this sink using the specified predicate.
 *
 * @tsplus fluent ets/Sink filterInput
 */
export function filterInput_<R, E, In, In1 extends In, In2 extends In1, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: Refinement<In1, In2>,
  __tsplusTrace?: string
): Sink<R, E, In2, L, Z>;
export function filterInput_<R, E, In, In1 extends In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: Predicate<In1>,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z>;
export function filterInput_<R, E, In, In1 extends In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: Predicate<In1>,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z> {
  return self.contramapChunks((chunk) => chunk.filter(f));
}

/**
 * Filter the input of this sink using the specified predicate.
 */
export function filterInput<In, In1 extends In, In2 extends In1>(
  f: Refinement<In1, In2>,
  __tsplusTrace?: string
): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In2, L, Z>;
export function filterInput<In, In1 extends In>(
  f: Predicate<In1>,
  __tsplusTrace?: string
): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z>;
export function filterInput<In, In1 extends In>(f: Predicate<In1>, __tsplusTrace?: string) {
  return <R, E, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E, In1, L, Z> => self.filterInput(f);
}
