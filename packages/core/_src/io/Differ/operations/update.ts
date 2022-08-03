/**
 * Constructs a differ that just diffs two values by returning a function that
 * sets the value to the new value. This differ does not support combining
 * multiple updates to the value compositionally and should only be used when
 * there is no compositional way to update them.
 *
 * @tsplus static effect/core/io/Differ.Ops update
 */
export function update<A>(): Differ<A, (a: A) => A> {
  return Differ.updateWith((_, a) => a)
}
