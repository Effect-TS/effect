/**
 * @since 2.5.0
 */
export function unsafeUpdateAt<A>(
  i: number,
  a: A,
  as: ReadonlyArray<A>
): ReadonlyArray<A> {
  if (as[i] === a) {
    return as
  } else {
    // tslint:disable-next-line: readonly-array
    const xs = [...as]
    xs[i] = a
    return xs
  }
}
