import { TestAnnotationMapSym } from "@effect/core/testing/TestAnnotationMap/definition"

export class TestAnnotationMapInternal implements TestAnnotationMap {
  readonly [TestAnnotationMapSym]: TestAnnotationMapSym = TestAnnotationMapSym
  constructor(readonly map: ImmutableMap<TestAnnotation<unknown>, unknown>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTestAnnotationMap(
  _: TestAnnotationMap
): asserts _ is TestAnnotationMapInternal {
  //
}
