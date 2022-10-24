import { update } from "@effect/core/testing/TestAnnotationMap/operations/_internal/update"

/**
 * Appends the specified annotation to the annotation map.
 *
 * @tsplus static effect/core/testing/TestAnnotationMap.Aspects annotate
 * @tsplus pipeable effect/core/testing/TestAnnotationMap annotate
 * @category mutations
 * @since 1.0.0
 */
export function annotate<V>(key: TestAnnotation<V>, value: V) {
  return (self: TestAnnotationMap): TestAnnotationMap =>
    update(
      self,
      key,
      (_) => key.combine(_, value)
    )
}
