/**
 * @category symbol
 * @since 1.0.0
 */
export const TestAnnotationMapSym = Symbol.for("@effect/core/testing/TestAnnotationMap")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TestAnnotationMapSym = typeof TestAnnotationMapSym

/**
 * An annotation map keeps track of annotations of different types.
 *
 * @tsplus type effect/core/testing/TestAnnotationMap
 * @category model
 * @since 1.0.0
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapSym]: TestAnnotationMapSym
}

/**
 * @tsplus type effect/core/testing/TestAnnotationMap.Ops
 * @category model
 * @since 1.0.0
 */
export interface TestAnnotationMapOps {
  readonly $: TestAnnotationMapAspects
}
export const TestAnnotationMap: TestAnnotationMapOps = {
  $: {}
}

/**
 * @tsplus type effect/core/testing/TestAnnotation.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TestAnnotationMapAspects {}
