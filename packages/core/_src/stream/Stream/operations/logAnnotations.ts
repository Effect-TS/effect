/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static effect/core/stream/Stream.Ops logAnnotations
 */
export function logAnnotations(
  __tsplusTrace?: string
): Stream<never, never, ImmutableMap<string, string>> {
  return Stream.fromEffect(FiberRef.currentLogAnnotations.value.get())
}
