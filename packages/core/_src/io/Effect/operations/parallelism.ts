/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 *
 * @tsplus static effect/core/io/Effect.Ops parallelism
 */
export function parallelism(__tsplusTrace?: string): Effect<never, never, Maybe<number>> {
  return FiberRef.currentParallelism.get()
}

/**
 * Retrieves the current maximum number of fibers for parallel operators and
 * uses it to run the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Ops parallelismWith
 */
export function parallelismWith<R, E, A>(
  f: (parallelism: Maybe<number>) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return FiberRef.currentParallelism.getWith(f)
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @tsplus static effect/core/io/Effect.Aspects withParallelism
 * @tsplus pipeable effect/core/io/Effect withParallelism
 */
export function withParallelism(n: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.suspendSucceed(
      self.apply(FiberRef.currentParallelism.locally(Maybe.some(n)))
    )
}

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operators.
 *
 * @tsplus getter effect/core/io/Effect withParallelismUnbounded
 */
export function withParallelismUnbounded<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
) {
  return Effect.suspendSucceed(
    self.apply(FiberRef.currentParallelism.locally(Maybe.none))
  )
}
