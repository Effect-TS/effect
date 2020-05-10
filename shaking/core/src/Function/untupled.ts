/**
 * Inverse function of `tupled`
 *
 * @since 2.4.0
 */
export function untupled<A extends ReadonlyArray<unknown>, B>(
  f: (a: A) => B
): (...a: A) => B {
  return (...a) => f(a)
}
