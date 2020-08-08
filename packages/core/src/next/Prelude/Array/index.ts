import * as A from "../../../Array"
import { pipe } from "../../../Function"
import { makeClosure } from "../Closure"
import { eqArray, EqualURI } from "../Equal"
import { makeIdentity } from "../Identity"
import { Sum } from "../Newtype"
import { makeAny, succeedF } from "../abstract/Any"
import { ApplicativeF, makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeCovariant } from "../abstract/Covariant"
import { makeDerive } from "../abstract/Derive"
import { HKT } from "../abstract/HKT"
import { makeMonad } from "../abstract/Monad"
import { makeTraversable } from "../abstract/Traversable"

/**
 * @category definitions
 */

export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

declare module "../abstract/HKT" {
  interface URItoKind<X, In, St, Env, Err, Out> {
    [ArrayURI]: A.Array<Out>
  }
}

/**
 * The `Closure` for `Sum<Array<A>>`.
 */
export function SumClosure<A>() {
  return pipe(Sum.of<readonly A[]>(), (SumArray) =>
    makeClosure<Sum<readonly A[]>>((l, r) =>
      SumArray.wrap([...SumArray.unwrap(l), ...SumArray.unwrap(r)])
    )
  )
}

/**
 * The `Closure` for `Array<A>`.
 */
export function Closure<A>() {
  return makeClosure<A.Array<A>>((x, y) => [...x, ...y])
}

/**
 * The `Identity` for `Array<A>`.
 */
export function Identity<A>() {
  return makeIdentity<A.Array<A>>([], Closure<A>().combine)
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
export const Covariant = makeCovariant(ArrayURI)({
  map: A.map
})

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(ArrayURI)({
  flatten: A.flatten
})

/**
 * The `AssociativeBoth` instance for `Array<A>`.
 */
export const AssociativeBoth = makeAssociativeBoth(ArrayURI)({
  both: A.zip
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
  foreach: <G>(G: ApplicativeF<G>) => <A, B>(f: (a: A) => HKT<G, B>) => (
    fa: readonly A[]
  ): HKT<G, readonly B[]> =>
    A.reduce_(fa, succeedF(G)([] as readonly B[]), (b, a) =>
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
export const Equal = makeDerive(
  ArrayURI,
  EqualURI
)({
  derive: (eq) => eqArray(eq)
})

/**
 * @category api
 */
export { range } from "../../../Array"
