import * as A from "../../../Array"
import { pipe } from "../../../Function"
import { makeClosure } from "../Closure"
import { eqArray, EqualURI } from "../Equal"
import { makeIdentity } from "../Identity"
import { Sum } from "../Newtype"
import { intersect } from "../Utils"
import { anyF, makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeCovariant } from "../abstract/Covariant"
import { makeDerive } from "../abstract/Derive"
import { makeIdentityBoth } from "../abstract/IdentityBoth"
import { makeIdentityFlatten } from "../abstract/IdentityFlatten"
import { makeMonad } from "../abstract/Monad"
import { implementForeachF, makeTraversable } from "../abstract/Traversable"

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
 * The `IdentityBoth` instance for `Array<A>`.
 */
export const IdentityBoth = makeIdentityBoth(ArrayURI)(intersect(Any, AssociativeBoth))

/**
 * The `Applicative` instance for `Array<A>`.
 */
export const Applicative = makeApplicative(ArrayURI)(intersect(Covariant, IdentityBoth))

/**
 * The `IdentityFlatten` instance for `Array<A>`.
 */
export const IdentityFlatten = makeIdentityFlatten(ArrayURI)(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Array<A>`.
 */
export const Monad = makeMonad(ArrayURI)(intersect(Covariant, IdentityFlatten))

/**
 * Traversable's `foreachF` for `Array`.
 */
export const foreachF = implementForeachF(ArrayURI)((_) => (G) => (f) => (fa) =>
  A.reduce_(fa, anyF(G)([] as typeof _._b[]), (b, a) =>
    pipe(
      b,
      G.both(f(a)),
      G.map(([x, y]) => [...x, y])
    )
  )
)

/**
 * The `Traversable` instance for `Array`.
 */
export const Traversable = makeTraversable(Covariant)({
  foreachF
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
