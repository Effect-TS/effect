/**
 * @since 2.5.0
 */
export function unsafeDeleteAt<A>(i: number, as: ReadonlyArray<A>): ReadonlyArray<A> {
  // tslint:disable-next-line: readonly-array
  const xs = [...as]
  xs.splice(i, 1)
  return xs
}
