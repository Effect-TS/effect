/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 *
 * @tsplus static ets/Effect/Ops parallelism
 */
export function parallelism(__tsplusTrace?: string): UIO<Option<number>> {
  return FiberRef.currentParallelism.value.get();
}

/**
 * Retrieves the current maximum number of fibers for parallel operators and
 * uses it to run the specified effect.
 *
 * @tsplus static ets/Effect/Ops parallelismWith
 */
export function parallelismWith<R, E, A>(
  f: (parallelism: Option<number>) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return FiberRef.currentParallelism.value.getWith(f);
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @tsplus fluent ets/Effect withParallelism
 */
export function withParallelism_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    self.apply(FiberRef.currentParallelism.value.locally(Option.some(n)))
  );
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @tsplus static ets/Effect/Aspects withParallelism
 */
export const withParallelism = Pipeable(withParallelism_);

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operators.
 *
 * @tsplus fluent ets/Effect withParallelismUnbounded
 */
export function withParallelismUnbounded<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    self.apply(FiberRef.currentParallelism.value.locally(Option.none))
  );
}
