import {
  concreteTestAnnotationMap,
  TestAnnotationMapInternal
} from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

export function overwrite<V>(
  self: TestAnnotationMap,
  key: TestAnnotation<V>,
  value: V
): TestAnnotationMap {
  concreteTestAnnotationMap(self)
  return new TestAnnotationMapInternal(self.map.set(key as TestAnnotation<unknown>, value))
}
