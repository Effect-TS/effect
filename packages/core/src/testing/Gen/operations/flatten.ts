/**
 * @tsplus getter effect/core/testing/Gen flatten
 */
export function flatten<R, A, R2>(self: Gen<R, Gen<R2, A>>): Gen<R | R2, A> {
  return self.flatMap(identity)
}
