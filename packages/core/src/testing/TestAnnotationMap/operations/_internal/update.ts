import { overwrite } from "@effect/core/testing/TestAnnotationMap/operations/_internal/overwrite"
import { concreteTestAnnotationMap } from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/** @internal */
export function update<V>(
  self: TestAnnotationMap,
  key: TestAnnotation<V>,
  f: (value: V) => V
): TestAnnotationMap {
  concreteTestAnnotationMap(self)
  let value = self.map.get(key as TestAnnotation<unknown>)
  if (value == null) {
    value = key.initial
  }
  return overwrite(self, key, f(value as V))
}
