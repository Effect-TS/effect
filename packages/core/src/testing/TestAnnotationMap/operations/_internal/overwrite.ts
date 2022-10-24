import {
  concreteTestAnnotationMap,
  TestAnnotationMapInternal
} from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/** @internal */
export function overwrite<V>(
  self: TestAnnotationMap,
  key: TestAnnotation<V>,
  value: V
): TestAnnotationMap {
  concreteTestAnnotationMap(self)
  return new TestAnnotationMapInternal(
    (self.map as Map<TestAnnotation<unknown>, unknown>)
      .set(key as TestAnnotation<unknown>, value)
  )
}
