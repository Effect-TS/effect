/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed.
 *
 * @tsplus static ets/Stream/Ops acquireReleaseExitUse
 */
export function acquireReleaseExitUse<R, E, A, R2, Z>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A, exit: Exit<unknown, unknown>) => RIO<R2, Z>,
  __tsplusTrace?: string
): Stream<R & R2, E, A> {
  return Stream.scoped(Effect.acquireReleaseExit(acquire, release));
}
