/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { Fiber } from "./Fiber.js"
import type { TestAnnotationsTypeId } from "./impl/TestAnnotations.js"
import type { Ref } from "./Ref.js"
import type { SortedSet } from "./SortedSet.js"
import type { TestAnnotation } from "./TestAnnotation.js"
import type { TestAnnotationMap } from "./TestAnnotationMap.js"

/**
 * @since 2.0.0
 */
export * from "./impl/TestAnnotations.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/TestAnnotations.js"

/**
 * The `Annotations` trait provides access to an annotation map that tests can
 * add arbitrary annotations to. Each annotation consists of a string
 * identifier, an initial value, and a function for combining two values.
 * Annotations form monoids and you can think of `Annotations` as a more
 * structured logging service or as a super polymorphic version of the writer
 * monad effect.
 *
 * @since 2.0.0
 */
export interface TestAnnotations {
  readonly [TestAnnotationsTypeId]: TestAnnotationsTypeId

  readonly ref: Ref<TestAnnotationMap>

  /**
   * Accesses an `Annotations` instance in the context and retrieves the
   * annotation of the specified type, or its default value if there is none.
   */
  get<A>(key: TestAnnotation<A>): Effect<never, never, A>

  /**
   * Accesses an `Annotations` instance in the context and appends the
   * specified annotation to the annotation map.
   */
  annotate<A>(key: TestAnnotation<A>, value: A): Effect<never, never, void>

  /**
   * Returns the set of all fibers in this test.
   */
  supervisedFibers(): Effect<never, never, SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>
}

/**
 * @since 2.0.0
 */
export declare namespace TestAnnotations {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TestAnnotations.js"
}
