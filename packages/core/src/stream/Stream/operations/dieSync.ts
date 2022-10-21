/**
 * Returns a stream that dies with the specified defect.
 *
 * @tsplus static effect/core/stream/Stream.Ops dieSync
 */
export function dieSync(defect: LazyArg<unknown>): Stream<never, never, never> {
  return Stream.fromEffect(Effect.dieSync(defect))
}
