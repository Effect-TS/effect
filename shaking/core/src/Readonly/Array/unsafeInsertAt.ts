/**
 * @since 2.5.0
 */
export function unsafeInsertAt<A>(
  i: number,
  a: A,
  as: ReadonlyArray<A>
): ReadonlyArray<A> {
  // tslint:disable-next-line: readonly-array
  const xs = [...as]
  xs.splice(i, 0, a)
  return xs
}
