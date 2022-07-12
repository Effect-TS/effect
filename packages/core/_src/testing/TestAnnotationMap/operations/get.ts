import { concreteTestAnnotationMap } from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/**
 * Retrieves the annotation of the specified type, or its default value if
 * there is none.
 *
 * @tsplus static effect/core/testing/TestAnnotationMap.Aspects get
 * @tsplus pipeable effect/core/testing/TestAnnotationMap get
 */
export function get<V>(key: TestAnnotation<V>) {
  return (self: TestAnnotationMap): V => {
    concreteTestAnnotationMap(self)
    return self.map
      .get(key as TestAnnotation<unknown>)
      .getOrElse(key.initial) as V
  }
}
