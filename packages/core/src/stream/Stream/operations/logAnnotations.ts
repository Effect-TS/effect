/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static effect/core/stream/Stream.Ops logAnnotations
 * @category logging
 * @since 1.0.0
 */
export function logAnnotations(): Stream<never, never, ReadonlyMap<string, string>> {
  return Stream.fromEffect(FiberRef.currentLogAnnotations.get)
}
