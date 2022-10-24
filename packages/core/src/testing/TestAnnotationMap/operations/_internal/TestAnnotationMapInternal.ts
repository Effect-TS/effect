import { TestAnnotationMapSym } from "@effect/core/testing/TestAnnotationMap/definition"

/** @internal */
export class TestAnnotationMapInternal implements TestAnnotationMap {
  readonly [TestAnnotationMapSym]: TestAnnotationMapSym = TestAnnotationMapSym
  constructor(readonly map: ReadonlyMap<TestAnnotation<unknown>, unknown>) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTestAnnotationMap(
  _: TestAnnotationMap
): asserts _ is TestAnnotationMapInternal {
  //
}
