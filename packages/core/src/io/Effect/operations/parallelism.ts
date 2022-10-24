import * as Option from "@fp-ts/data/Option"

/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 *
 * @tsplus static effect/core/io/Effect.Ops parallelism
 * @category getters
 * @since 1.0.0
 */
export function parallelism(): Effect<never, never, Option.Option<number>> {
  return FiberRef.currentParallelism.get
}

/**
 * Retrieves the current maximum number of fibers for parallel operators and
 * uses it to run the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Ops parallelismWith
 * @category getters
 * @since 1.0.0
 */
export function parallelismWith<R, E, A>(
  f: (parallelism: Option.Option<number>) => Effect<R, E, A>
): Effect<R, E, A> {
  return FiberRef.currentParallelism.getWith(f)
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @tsplus static effect/core/io/Effect.Aspects withParallelism
 * @tsplus pipeable effect/core/io/Effect withParallelism
 * @category aspects
 * @since 1.0.0
 */
export function withParallelism(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.suspendSucceed(
      self.apply(FiberRef.currentParallelism.locally(Option.some(n)))
    )
}

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operators.
 *
 * @tsplus getter effect/core/io/Effect withParallelismUnbounded
 * @category aspects
 * @since 1.0.0
 */
export function withParallelismUnbounded<R, E, A>(self: Effect<R, E, A>) {
  return Effect.suspendSucceed(
    self.apply(FiberRef.currentParallelism.locally(Option.none))
  )
}
