/**
 * Applicative's ap.
 *
 * @tsplus static effect/core/io/Exit.Aspects ap
 * @tsplus pipeable effect/core/io/Exit ap
 */
export function ap<E, A, B>(that: Exit<E, (a: A) => B>) {
  return (self: Exit<E, A>): Exit<E, B> => that.flatMap((f) => self.map((a) => f(a)))
}
