/**
 * @tsplus static effect/core/testing/Gen.Ops elements
 * @category constructors
 * @since 1.0.0
 */
export function elements<A>(as: Iterable<A>): Gen<never, A> {
  const array = Array.from(as)
  return array.length === 0 ?
    Gen.empty :
    Gen.int({ min: 0, max: array.length - 1 }).map((n) => array[n]!)
}
