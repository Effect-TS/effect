import type { TestAnnotationMapTypeId } from "./impl/TestAnnotationMap.js"
import type { TestAnnotation } from "./TestAnnotation.js"

export * from "./impl/TestAnnotationMap.js"
export * from "./internal/Jumpers/TestAnnotationMap.js"

export declare namespace TestAnnotationMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TestAnnotationMap.js"
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
