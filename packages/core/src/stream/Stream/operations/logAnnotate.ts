/**
 * Annotates each log in streams composed after this with the specified log
 * annotation.
 *
 * @tsplus static effect/core/stream/Stream.Ops logAnnotate
 * @category logging
 * @since 1.0.0
 */
export function logAnnotate(key: string, value: string): Stream<never, never, void> {
  return Stream.scoped(
    FiberRef.currentLogAnnotations.get.flatMap((annotations) =>
      FiberRef.currentLogAnnotations.locallyScoped(
        (annotations as Map<string, string>).set(key, value)
      )
    )
  )
}
