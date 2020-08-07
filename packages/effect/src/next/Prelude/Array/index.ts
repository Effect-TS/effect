import * as A from "../../../Array"
import { pipe } from "../../../Function"
import * as C from "../Closure"
import * as Eq from "../Equal"
import * as I from "../Identity"
import { Sum } from "../Newtype"
import { makeAny, succeed } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { AssociativeBoth1, makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import * as COVA from "../abstract/Covariant"
import { Derive11 } from "../abstract/Derive"
import { HKT } from "../abstract/HKT"
import * as IB from "../abstract/IdentityBoth"
import { makeMonad } from "../abstract/Monad"
import { makeTraversable } from "../abstract/Traversable"

/**
 * @category definitions
 */

export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

declare module "../abstract/HKT" {
  interface URItoKind<A> {
    [ArrayURI]: A.Array<A>
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
export const Any = makeAny(ArrayURI)({
  any: () => []
})

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const Covariant = COVA.makeCovariant(ArrayURI)({
  map: A.map
})

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(ArrayURI)({
  flatten: A.flatten
})

export const AssociativeBoth: AssociativeBoth1<ArrayURI> = makeAssociativeBoth(
  ArrayURI
)({
  both: (fb) => (fa) => A.zip_(fa, fb)
})

/**
 * The `Monad` instance for `Array<A>`.
 */
export const Applicative = makeApplicative(ArrayURI)({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * The `Monad` instance for `Array<A>`.
 */
export const Monad = makeMonad(ArrayURI)({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Traversable` instance for `Array`.
 */
export const Traversable = makeTraversable(ArrayURI)({
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
})

/**
 * The `Derive<Array, Equal>` instance for `Equal<Array<A>>`.
 */
export const Equal: Derive11<ArrayURI, Eq.EqualURI> = {
  Derive: "Derive",
  derive: (eq) => Eq.array(eq)
}

/**
 * @category api
 */
export { range } from "../../../Array"
