/**
 * `Hash[A]` provides a way to hash a value
 */
export interface Hash<A> {
  readonly hash: (x: A) => number
}
