/**
 * @tsplus static effect/core/io/LogLevel.Ops __call
 * @tsplus static effect/core/io/LogLevel.Ops locally
 */
export function locally_(
  self: LogLevel,
  __tsplusTrace?: string
): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> {
  return FiberRef.currentLogLevel.value.locally(self)
}
