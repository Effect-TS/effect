// ets_tracing: off

/**
 * `Equal[A]` provides evidence that two values of type `A` can be
 * compared for equality.
 */
export interface Equal<A> {
  /**
   * Returns whether two values of type `A` are equal.
   */
  readonly equals: (x: A, y: A) => boolean
}
