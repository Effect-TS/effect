/**
 * A sink that folds its inputs with the provided function and initial state.
 *
 * @tsplus static ets/Sink/Ops foldLeft
 */
export function foldLeft<In, S>(
  z: LazyArg<S>,
  f: (s: S, input: In) => S,
  __tsplusTrace?: string
): Sink<unknown, never, In, never, S> {
  return Sink.fold(z, () => true, f).dropLeftover();
}
