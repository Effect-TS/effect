/**
 * Accesses an `Annotations` instance in the environment and appends the
 * specified annotation to the annotation map.
 *
 * @tsplus static effect/core/testing/Annotations.Ops annotate
 */
export function annotate<V>(key: TestAnnotation<V>, value: V): Effect<Annotations, never, void> {
  return Effect.serviceWithEffect(
    Annotations.Tag,
    (annotations) => annotations.annotate(key, value)
  )
}
