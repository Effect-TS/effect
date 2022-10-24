import {
  concreteTestAnnotationMap,
  TestAnnotationMapInternal
} from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus pipeable-operator effect/core/testing/TestAnnotationMap +
 * @tsplus static effect/core/testing/TestAnnotationMap.Aspects combine
 * @tsplus pipeable effect/core/testing/TestAnnotationMap combine
 * @category mutations
 * @since 1.0.0
 */
export function combine(that: TestAnnotationMap) {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    concreteTestAnnotationMap(self)
    concreteTestAnnotationMap(that)
    const map = pipe(
      Chunk.fromIterable(self.map),
      Chunk.concat(Chunk.fromIterable(that.map)),
      Chunk.reduce(
        new Map<TestAnnotation<unknown>, unknown>(),
        (acc, [key, oldValue]) => {
          let newValue = acc.get(key)
          if (newValue == null) {
            newValue = oldValue
          }
          newValue = key.combine(newValue, oldValue)
          return acc.set(key, newValue)
        }
      )
    )

    return new TestAnnotationMapInternal(map)
  }
}
