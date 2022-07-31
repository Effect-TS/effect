/**
 * @tsplus static effect/core/io/LogLevel.Ops __call
 * @tsplus static effect/core/io/LogLevel.Ops locally
 */
export function locally(self: LogLevel): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> {
  return FiberRef.currentLogLevel.locally(self)
}
