import { Tag } from "@fp-ts/data/Context"
import type { SortedSet } from "@fp-ts/data/SortedSet"

/**
 * The `Annotations` trait provides access to an annotation map that tests can
 * add arbitrary annotations to. Each annotation consists of a string
 * identifier, an initial value, and a function for combining two values.
 * Annotations form monoids and you can think of `Annotations` as a more
 * structured logging service or as a super polymorphic version of the writer
 * monad effect.
 *
 * @tsplus type effect/core/testing/Annotations
 * @category model
 * @since 1.0.0
 */
export interface Annotations {
  readonly annotate: <V>(key: TestAnnotation<V>, value: V) => Effect<never, never, void>
  readonly get: <V>(key: TestAnnotation<V>) => Effect<never, never, V>
  // readonly withAnnotation: <R, E>(
  //   effect: Effect<R, TestFailure<E>, TestSuccess>
  // ) => Effect<R, TestFailure<E>, TestSuccess>
  readonly supervisedFibers: Effect<never, never, SortedSet<Fiber.Runtime<unknown, unknown>>>
}

/**
 * @tsplus type effect/core/testing/Annotations.Ops
 * @category model
 * @since 1.0.0
 */
export interface AnnotationsOps {
  readonly Tag: Tag<Annotations>
}
export const Annotations: AnnotationsOps = {
  Tag: Tag<Annotations>()
}
