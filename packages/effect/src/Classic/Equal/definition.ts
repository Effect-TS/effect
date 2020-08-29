/**
 * `Equal[A]` provides implicit evidence that two values of type `A` can be
 * compared for equality.
 */
export interface Equal<A> {
  /**
   * Returns whether two values of type `A` are equal.
   */
  readonly equals: (y: A) => (x: A) => boolean
}
