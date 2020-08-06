import * as A from "../../../Array"
import { pipe } from "../../../Function"
import * as C from "../Closure"
import { Covariant } from "../Covariant"
import { Derive11 } from "../Derive"
import * as Eq from "../Equal"
import { HKT } from "../HKT"
import * as I from "../Identity"
import * as IB from "../IdentityBoth"
import { Sum } from "../Newtype"
import { Traversable1 } from "../Traversable"

/**
 * @category definitions
 */

export const URI = "Array"
export type URI = typeof URI

declare module "../HKT" {
  interface URItoKind<A> {
    [URI]: readonly A[]
  }
}

/**
 * @category traversable
 */

export const Traversable: Traversable1<URI> = {
  URI,
  map: (f) => (fa) => fa.map(f),
  foreach: <G>(G: IB.IdentityBoth<G> & Covariant<G>) => <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: readonly A[]): HKT<G, readonly B[]> =>
    A.reduce_(fa, IB.succeed(G)([] as readonly B[]), (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(([x, y]) => [...x, y])
      )
    )
}

/**
 * @category closure
 */

export function SumClosure<A>(): C.Closure<Sum<readonly A[]>> {
  return pipe(Sum<readonly A[]>(), (SumArray) =>
    C.make((l, r) => SumArray.wrap([...SumArray.unwrap(l), ...SumArray.unwrap(r)]))
  )
}

export function Closure<A>(): C.Closure<readonly A[]> {
  return C.make((x, y) => [...x, ...y])
}

/**
 * @category identity
 */

export function Identity<A>(): I.Identity<readonly A[]> {
  return I.make<readonly A[]>([], Closure<A>().combine)
}

/**
 * @category equal
 */
export const Equal: Derive11<URI, Eq.URI> = {
  derive: (eq) => (y) => (x) =>
    x.length === y.length &&
    (x.length > 0 ? x.map((a, i) => eq(y[i])(a)).reduce((x, y) => x && y) : true)
}

/**
 * @category api
 */
export { range } from "../../../Array"
