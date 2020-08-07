import * as A from "../../../Array"
import { pipe } from "../../../Function"
import * as C from "../Closure"
import * as Eq from "../Equal"
import * as I from "../Identity"
import { Sum } from "../Newtype"
import { Any1, succeed } from "../abstract/Any"
import { Applicative1 } from "../abstract/Applicative"
import { AssociativeBoth1 } from "../abstract/AssociativeBoth"
import { AssociativeFlatten1 } from "../abstract/AssociativeFlatten"
import * as COVA from "../abstract/Covariant"
import { Derive11 } from "../abstract/Derive"
import { HKT } from "../abstract/HKT"
import * as IB from "../abstract/IdentityBoth"
import * as M from "../abstract/Monad"
import { Traversable1 } from "../abstract/Traversable"

/**
 * @category definitions
 */

export const URI = "Array"
export type URI = typeof URI

declare module "../abstract/HKT" {
  interface URItoKind<A> {
    [URI]: A.Array<A>
  }
}

/**
 * The `Closure` for `Sum<Array<A>>`.
 */
export function SumClosure<A>(): C.Closure<Sum<readonly A[]>> {
  return pipe(Sum.of<readonly A[]>(), (SumArray) =>
    C.make((l, r) => SumArray.wrap([...SumArray.unwrap(l), ...SumArray.unwrap(r)]))
  )
}

/**
 * The `Closure` for `Array<A>`.
 */
export function Closure<A>(): C.Closure<readonly A[]> {
  return C.make((x, y) => [...x, ...y])
}

/**
 * The `Identity` for `Array<A>`.
 */
export function Identity<A>(): I.Identity<readonly A[]> {
  return I.make<readonly A[]>([], Closure<A>().combine)
}

/**
 * The `Any` instance for `Array<A>`.
 */
export const Any: Any1<URI> = {
  URI,
  Any: "Any",
  any: () => []
}

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const Covariant: COVA.Covariant1<URI> = {
  URI,
  Covariant: "Covariant",
  map: A.map
}

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const AssociativeFlatten: AssociativeFlatten1<URI> = {
  URI,
  AssociativeFlatten: "AssociativeFlatten",
  flatten: A.flatten
}

export const AssociativeBoth: AssociativeBoth1<URI> = {
  URI,
  AssociativeBoth: "AssociativeBoth",
  both: (fb) => (fa) => A.zip_(fa, fb)
}

/**
 * The `Monad` instance for `Array<A>`.
 */
export const Applicative: Applicative1<URI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

/**
 * The `Monad` instance for `Array<A>`.
 */
export const Monad: M.Monad1<URI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

/**
 * The `Traversable` instance for `Array`.
 */
export const Traversable: Traversable1<URI> = {
  Traversable: "Traversable",
  foreach: <G>(G: IB.IdentityBoth<G> & COVA.Covariant<G>) => <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: readonly A[]): HKT<G, readonly B[]> =>
    A.reduce_(fa, succeed(G)([] as readonly B[]), (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(([x, y]) => [...x, y])
      )
    ),
  ...Covariant
}

/**
 * The `Derive<Array, Equal>` instance for `Equal<Array<A>>`.
 */
export const Equal: Derive11<URI, Eq.URI> = {
  Derive: "Derive",
  derive: (eq) => Eq.array(eq)
}

/**
 * @category api
 */
export { range } from "../../../Array"
