import { pipe } from "../Function"
import { intersect } from "../Utils"
import { makeAny } from "../_abstract/Any"
import { makeApplicative } from "../_abstract/Applicative"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeClosure } from "../_abstract/Closure"
import { makeCovariant } from "../_abstract/Covariant"
import { anyF } from "../_abstract/DSL"
import { makeDerive } from "../_abstract/Derive"
import * as Eq from "../_abstract/Equal"
import { makeIdentity } from "../_abstract/Identity"
import { makeIdentityBoth } from "../_abstract/IdentityBoth"
import { makeIdentityFlatten } from "../_abstract/IdentityFlatten"
import { makeMonad } from "../_abstract/Monad"
import { Sum } from "../_abstract/Newtype"
import { implementForeachF, makeTraversable } from "../_abstract/Traversable"
import * as A from "../_system/Array"

/**
 * Typelevel map entries
 */
export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

declare module "../_abstract/HKT" {
  interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {
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
export const DeriveEqual = makeDerive(
  ArrayURI,
  Eq.EqualURI
)({
  derive: (eq) => getEq(eq)
})

/**
 * Derives an `Equal[Array[A]]` given an `Equal[A]`.
 */
export function getEq<A>(EqA: Eq.Equal<A>): Eq.Equal<A.Array<A>> {
  return {
    equals: (y) => (x) => {
      if (x.length === y.length) {
        for (let i = 0; i < x.length; i++) {
          if (!EqA.equals(y[i])(x[i])) {
            return false
          }
        }
        return true
      }
      return false
    }
  }
}
