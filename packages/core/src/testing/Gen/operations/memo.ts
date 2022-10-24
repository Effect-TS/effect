/**
 * @tsplus static effect/core/testing/Gen.Ops memo
 * @category constructors
 * @since 1.0.0
 */
export function memo<R, A>(builder: (maxDepth: number) => Gen<R, A>) {
  const previous: { [depth: number]: Gen<R, A> } = {}
  let remainingDepth = 10
  return (maxDepth?: number): Gen<R, A> => {
    const n = maxDepth !== undefined ? maxDepth : remainingDepth
    if (!Object.prototype.hasOwnProperty.call(previous, n)) {
      const prev = remainingDepth
      remainingDepth = n - 1
      previous[n] = builder(n)
      remainingDepth = prev
    }
    return previous[n]!
  }
}
