/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static ets/Stream/Ops logAnnotations
 */
export function logAnnotations(
  __tsplusTrace?: string
): Stream<unknown, never, ImmutableMap<string, string>> {
  return Stream.fromEffect(FiberRef.currentLogAnnotations.value.get())
}
