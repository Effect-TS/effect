import { TestAnnotationMapInternal } from "@effect/core/testing/TestAnnotationMap/operations/_internal/TestAnnotationMapInternal"

/**
 * An empty annotation map.
 *
 * @tsplus static effect/core/testing/TestAnnotationMap.Ops empty
 */
export const empty: TestAnnotationMap = new TestAnnotationMapInternal(ImmutableMap.empty())
