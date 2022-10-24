/**
 * Returns a stream that dies with the specified defect.
 *
 * @tsplus static effect/core/stream/Stream.Ops dieSync
 * @category constructors
 * @since 1.0.0
 */
export function dieSync(defect: LazyArg<unknown>): Stream<never, never, never> {
  return Stream.fromEffect(Effect.dieSync(defect))
}
