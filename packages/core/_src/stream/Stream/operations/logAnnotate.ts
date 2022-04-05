/**
 * Annotates each log in streams composed after this with the specified log
 * annotation.
 *
 * @tsplus static ets/Stream/Ops logAnnotate
 */
export function logAnnotate(
  key: LazyArg<string>,
  value: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.scoped(
    FiberRef.currentLogAnnotations.value
      .get()
      .flatMap((annotations) =>
        FiberRef.currentLogAnnotations.value.locallyScoped(
          annotations.set(key(), value())
        )
      )
  );
}
