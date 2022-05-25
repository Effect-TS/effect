/**
 * A sink that effectfully folds its inputs with the provided function and
 * initial state.
 *
 * @tsplus static ets/Sink/Ops foldLeftEffect
 */
export function foldLeftEffect<R, E, In, S>(
  z: LazyArg<S>,
  f: (s: S, input: In) => Effect<R, E, S>,
  __tsplusTrace?: string
): Sink<R, E, In, In, S> {
  return Sink.foldEffect(z, () => true, f)
}
