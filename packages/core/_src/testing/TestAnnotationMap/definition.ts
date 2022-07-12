export const TestAnnotationMapSym = Symbol.for("@effect/core/testing/TestAnnotationMap")
export type TestAnnotationMapSym = typeof TestAnnotationMapSym

/**
 * An annotation map keeps track of annotations of different types.
 *
 * @tsplus type effect/core/testing/TestAnnotationMap
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapSym]: TestAnnotationMapSym
}

/**
 * @tsplus type effect/core/testing/TestAnnotationMap.Ops
 */
export interface TestAnnotationMapOps {
  readonly $: TestAnnotationMapAspects
}
export const TestAnnotationMap: TestAnnotationMapOps = {
  $: {}
}

export interface TestAnnotationMapAspects {}
