import {
  concreteTestAnnotationMap,
  TestAnnotationMapInternal
} from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/**
 * @tsplus pipeable-operator effect/core/testing/TestAnnotationMap +
 * @tsplus static effect/core/testing/TestAnnotationMap.Aspects combine
 * @tsplus pipeable effect/core/testing/TestAnnotationMap combine
 */
export function combine(that: TestAnnotationMap) {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    concreteTestAnnotationMap(self)
    concreteTestAnnotationMap(that)
    const map = Chunk.from(self.map).concat(Chunk.from(that.map)).reduce(
      ImmutableMap.empty<TestAnnotation<unknown>, unknown>(),
      (acc, { tuple: [key, value] }) =>
        acc.set(key, acc.get(key).fold(value, (a) => key.combine(a, value)))
    )
    return new TestAnnotationMapInternal(map)
  }
}
