/**
 * Annotates each log in streams composed after this with the specified log
 * annotation.
 *
 * @tsplus static effect/core/stream/Stream.Ops logAnnotate
 */
export function logAnnotate(key: string, value: string): Stream<never, never, void> {
  return Stream.scoped(
    FiberRef.currentLogAnnotations.get.flatMap((annotations) =>
      FiberRef.currentLogAnnotations.locallyScoped(
        annotations.set(key, value)
      )
    )
  )
}
