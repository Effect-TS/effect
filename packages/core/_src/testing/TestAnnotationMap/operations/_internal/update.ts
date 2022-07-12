import { overwrite } from "@effect/core/testing/TestAnnotationMap/operations/_internal/overwrite"
import { concreteTestAnnotationMap } from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

export function update<V>(
  self: TestAnnotationMap,
  key: TestAnnotation<V>,
  f: (value: V) => V
): TestAnnotationMap {
  concreteTestAnnotationMap(self)
  return overwrite(
    self,
    key,
    f(self.map.get(key as TestAnnotation<unknown>).getOrElse(key.initial) as V)
  )
}
