import type { TestAnnotationMapTypeId } from "../TestAnnotationMap.js"
import type { TestAnnotation } from "./TestAnnotation.js"

export * from "../internal/Jumpers/TestAnnotationMap.js"
export * from "../TestAnnotationMap.js"

export declare namespace TestAnnotationMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../TestAnnotationMap.js"
}
/**
 * An annotation map keeps track of annotations of different types.
 *
 * @since 2.0.0
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId
  /** @internal */
  readonly map: ReadonlyMap<TestAnnotation<unknown>, unknown>
}
