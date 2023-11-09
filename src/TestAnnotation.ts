import type { Context } from "./Context.js"
import type { Equal } from "./Equal.js"
import type { TestAnnotationTypeId } from "./impl/TestAnnotation.js"

export * from "./impl/TestAnnotation.js"
export * from "./internal/Jumpers/TestAnnotation.js"

export declare namespace TestAnnotation {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TestAnnotation.js"
}
/**
 * @since 2.0.0
 */
export interface TestAnnotation<A> extends Equal {
  readonly [TestAnnotationTypeId]: TestAnnotationTypeId
  readonly identifier: string
  readonly tag: Context.Tag<A, A>
  readonly initial: A
  readonly combine: (a: A, b: A) => A
}
