import { TestAnnotationMapInternal } from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/**
 * An empty annotation map.
 *
 * @tsplus static effect/core/testing/TestAnnotationMap.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export const empty: TestAnnotationMap = new TestAnnotationMapInternal(new Map())
