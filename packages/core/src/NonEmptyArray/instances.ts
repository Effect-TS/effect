import * as P from "../Prelude"
import * as A from "./operations"

export const Any = P.instance<P.Any<[A.NonEmptyArrayURI]>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[A.NonEmptyArrayURI]>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<
  P.AssociativeFlatten<[A.NonEmptyArrayURI]>
>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<[A.NonEmptyArrayURI]>>({
  map: A.map
})

export const Applicative = P.instance<P.Applicative<[A.NonEmptyArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[A.NonEmptyArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<[A.NonEmptyArrayURI]>>({
  map: A.map,
  forEachF: A.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<[A.NonEmptyArrayURI]>>({
  map: A.map,
  forEachWithIndexF: A.forEachWithIndexF
})

export const Extend = P.instance<P.Extend<[A.NonEmptyArrayURI]>>({
  extend: A.extend
})

export const Reduce = P.instance<P.Reduce<[A.NonEmptyArrayURI]>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[A.NonEmptyArrayURI]>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<[A.NonEmptyArrayURI]>
>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<[A.NonEmptyArrayURI]>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[A.NonEmptyArrayURI]>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[A.NonEmptyArrayURI]>>({
  foldMapWithIndex: A.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[A.NonEmptyArrayURI]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[A.NonEmptyArrayURI]>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(
  Covariant
)

/**
 * Conditionals
 */
const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }
