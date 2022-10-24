import { concreteTestAnnotationMap } from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/**
 * Retrieves the annotation of the specified type, or its default value if
 * there is none.
 *
 * @tsplus static effect/core/testing/TestAnnotationMap.Aspects get
 * @tsplus pipeable effect/core/testing/TestAnnotationMap get
 * @category mutations
 * @since 1.0.0
 */
export function get<V>(key: TestAnnotation<V>) {
  return (self: TestAnnotationMap): V => {
    concreteTestAnnotationMap(self)
    const value = self.map.get(key as TestAnnotation<unknown>)
    if (value == null) {
      return key.initial as V
    }
    return value as V
  }
}
