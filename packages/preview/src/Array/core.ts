import { flow, pipe } from "../Function"
import { intersect } from "../Utils"
import { AnyK } from "../_abstract/Any"
import { ApplicativeK } from "../_abstract/Applicative"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import { makeClosure } from "../_abstract/Closure"
import { CovariantK } from "../_abstract/Covariant"
import { anyF } from "../_abstract/DSL"
import { DeriveK } from "../_abstract/Derive"
import * as Eq from "../_abstract/Equal"
import { FoldMapK } from "../_abstract/FoldMap"
import { FoldableK } from "../_abstract/Foldable"
import { instance } from "../_abstract/HKT"
import { Identity, makeIdentity } from "../_abstract/Identity"
import { IdentityBothK } from "../_abstract/IdentityBoth"
import { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import { MonadK } from "../_abstract/Monad"
import { Sum } from "../_abstract/Newtype"
import { ReduceK } from "../_abstract/Reduce"
import { ReduceRightK } from "../_abstract/ReduceRight"
import { implementForeachF, TraversableK } from "../_abstract/Traversable"
import {
  implementForeachWithKeysF,
  TraversableWithKeysK
} from "../_abstract/TraversableWithKeys"
import { implementSeparateF, WiltableK } from "../_abstract/Wiltable"
import {
  implementSeparateWithKeysF,
  WiltableWithKeysK
} from "../_abstract/WiltableWithKeys"
import { implementCompactF, WitherableK } from "../_abstract/Witherable"
import { implemenCompactWithKeysF } from "../_abstract/WitherableWithKeys"
import * as A from "../_system/Array"

/**
 * Typelevel map entries
 */
export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [ArrayURI]: A.Array<Out>
  }
  interface URItoKeys<TL0, TL1, TL2, TL3, K, NK extends string> {
    [ArrayURI]: number
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
export const Any = instance<AnyK<ArrayURI>>({
  any: () => []
})

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const Covariant = instance<CovariantK<ArrayURI>>({
  map: A.map
})

/**
 * The `Covariant` instance for `Array<A>`.
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<ArrayURI>>({
  flatten: A.flatten
})

/**
 * The `AssociativeBoth` instance for `Array<A>`.
 */
export const AssociativeBoth = instance<AssociativeBothK<ArrayURI>>({
  both: A.zip
})

/**
 * The `IdentityBoth` instance for `Array<A>`.
 */
export const IdentityBoth = instance<IdentityBothK<ArrayURI>>(
  intersect(Any, AssociativeBoth)
)

/**
 * The `Applicative` instance for `Array<A>`.
 */
export const Applicative = instance<ApplicativeK<ArrayURI>>(
  intersect(Covariant, IdentityBoth)
)

/**
 * The `IdentityFlatten` instance for `Array<A>`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<ArrayURI>>(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Array<A>`.
 */
export const Monad = instance<MonadK<ArrayURI>>(intersect(Covariant, IdentityFlatten))

/**
 * Traversable's `foreachF` for `Array`.
 */
export const foreachF = implementForeachF<ArrayURI>()((_) => (G) => (f) => (fa) =>
  A.reduce_(fa, anyF(G)([] as typeof _.B[]), (b, a) =>
    pipe(
      b,
      G.both(f(a)),
      G.map(([x, y]) => [...x, y])
    )
  )
)

/**
 * TraversableWithKeys's `foreachWithKeysF` for `Array`.
 */
export const foreachWithKeysF = implementForeachWithKeysF<ArrayURI>()(
  (_) => (G) => (f) => (fa) =>
    A.reduceWithIndex_(fa, anyF(G)([] as typeof _._b[]), (i, b, a) =>
      pipe(
        b,
        G.both(f(a, i)),
        G.map(([x, y]) => [...x, y])
      )
    )
)

/**
 * The `Traversable` instance for `Array`.
 */
export const Traversable = instance<TraversableK<ArrayURI>>({
  ...Covariant,
  foreachF
})

/**
 * The `TraversableWithKeys` instance for `Array`.
 */
export const TraversableWithKeys = instance<TraversableWithKeysK<ArrayURI>>({
  ...Covariant,
  foreachWithKeysF
})

/**
 * The `Derive<Array, Equal>` instance for `Equal<Array<A>>`.
 */
export const DeriveEqual = instance<DeriveK<ArrayURI, Eq.EqualURI>>({
  derive: (eq) => getEqual(eq)
})

/**
 * Derives an `Equal[Array[A]]` given an `Equal[A]`.
 */
export function getEqual<A>(EqA: Eq.Equal<A>): Eq.Equal<A.Array<A>> {
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

/**
 * FoldMap using `Identity<A>`
 */
export const foldMap: <I>(
  I: Identity<I>
) => <A>(f: (a: A) => I) => (fa: readonly A[]) => I = (I) => (f) =>
  foldMapWithIndex(I)((_, a) => f(a))

/**
 * FoldMap using `Identity<A>`
 */
export const foldMap_: <I>(
  I: Identity<I>
) => <A>(fa: readonly A[], f: (a: A) => I) => I = (I) => (fa, f) =>
  foldMapWithIndex_(I)(fa, (_, a) => f(a))

/**
 * FoldMap using `Identity<A>`
 */
export const foldMapWithIndex: <I>(
  I: Identity<I>
) => <A>(f: (i: number, a: A) => I) => (fa: readonly A[]) => I = (I) => (f) => (fa) =>
  fa.reduce((b, a, i) => I.combine(f(i, a))(b), I.identity)

/**
 * FoldMap using `Identity<A>`
 */
export const foldMapWithIndex_: <I>(
  I: Identity<I>
) => <A>(fa: readonly A[], f: (i: number, a: A) => I) => I = (I) => (fa, f) =>
  fa.reduce((b, a, i) => I.combine(f(i, a))(b), I.identity)

/**
 * The `FoldMap` instance for `Array<A>`.
 */
export const FoldMap = instance<FoldMapK<ArrayURI>>({
  foldMap
})

/**
 * The `Reduce` instance for `Array<A>`.
 */
export const Reduce = instance<ReduceK<ArrayURI>>({
  reduce: A.reduce
})

/**
 * The `ReduceRight` instance for `Array<A>`.
 */
export const ReduceRight = instance<ReduceRightK<ArrayURI>>({
  reduce: A.reduceRight
})

/**
 * The `Foldable` instance for `Array<A>`.
 */
export const Foldable = instance<FoldableK<ArrayURI>>(
  intersect(FoldMap, Reduce, ReduceRight)
)

/**
 * Witherable's compactF for `Array<A>`.
 */
export const compactF = implementCompactF<ArrayURI>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.compact))
)

/**
 * WitherableWithKeys's compactWithKeysF for `Array<A>`.
 */
export const compactWithKeysF = implemenCompactWithKeysF<
  ArrayURI
>()((_) => (G) => (f) => flow(foreachWithKeysF(G)(f), G.map(A.compact)))

/**
 * The `Witherable` instance for `Array<A>`.
 */
export const Witherable = instance<WitherableK<ArrayURI>>({
  compactF
})

/**
 * Wiltable's separateF for `Array<A>`.
 */
export const separateF = implementSeparateF<ArrayURI>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.separate))
)

/**
 * The `Wiltable` instance for `Array<A>`.
 */
export const Wiltable = instance<WiltableK<ArrayURI>>({
  separateF
})

/**
 * WiltableWithKeys's separateWithKeysF for `Array<A>`.
 */
export const separateWithKeysF = implementSeparateWithKeysF<
  ArrayURI
>()((_) => (G) => (f) => flow(foreachWithKeysF(G)(f), G.map(A.separate)))

/**
 * The `WiltableWithKeys` instance for `Array<A>`.
 */
export const WiltableWithKeys = instance<WiltableWithKeysK<ArrayURI>>({
  separateWithKeysF
})
