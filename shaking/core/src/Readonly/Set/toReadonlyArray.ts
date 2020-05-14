import type { Ord } from "../../Ord"
/**
 * @since 2.5.0
 */

export function toReadonlyArray<A>(
  O: Ord<A>
): (set: ReadonlySet<A>) => ReadonlyArray<A> {
  return (x) => {
    // tslint:disable-next-line: readonly-array
    const r: Array<A> = []
    x.forEach((e) => r.push(e))
    return r.sort(O.compare)
  }
}
