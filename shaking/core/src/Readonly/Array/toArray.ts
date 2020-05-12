/**
 * @since 2.5.0
 */
// tslint:disable-next-line: readonly-array
export function toArray<A>(ras: ReadonlyArray<A>): Array<A> {
  const l = ras.length
  const as = Array(l)
  for (let i = 0; i < l; i++) {
    as[i] = ras[i]
  }
  return as
}
