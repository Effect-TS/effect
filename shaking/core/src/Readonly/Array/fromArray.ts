import { empty } from "./empty"

/**
 * @since 2.5.0
 */
// tslint:disable-next-line: readonly-array
export function fromArray<A>(as: Array<A>): ReadonlyArray<A> {
  const l = as.length
  if (l === 0) {
    return empty
  }
  const ras = Array(l)
  for (let i = 0; i < l; i++) {
    ras[i] = as[i]
  }
  return ras
}
