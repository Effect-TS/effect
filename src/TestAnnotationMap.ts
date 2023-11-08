import type { TestAnnotation } from "./TestAnnotation.js"
import type { TestAnnotationMapTypeId } from "./TestAnnotationMap.impl.js"

export * from "./internal/Jumpers/TestAnnotationMap.js"
export * from "./TestAnnotationMap.impl.js"

export declare namespace TestAnnotationMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./TestAnnotationMap.impl.js"
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
