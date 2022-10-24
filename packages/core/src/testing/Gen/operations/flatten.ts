import { identity } from "@fp-ts/data/Function"

/**
 * @tsplus getter effect/core/testing/Gen flatten
 * @category sequencing
 * @since 1.0.0
 */
export function flatten<R, A, R2>(self: Gen<R, Gen<R2, A>>): Gen<R | R2, A> {
  return self.flatMap(identity)
}
