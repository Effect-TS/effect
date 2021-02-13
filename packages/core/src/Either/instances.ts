import type { EitherURI } from "../Modules"
import type { URI } from "../Prelude"
import * as P from "../Prelude"
import type { V } from "./definition"
import * as E from "./operations"

export const Any = P.instance<P.Any<[URI<EitherURI>], V>>({
  any: () => E.right({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<EitherURI>], V>>({
  both: E.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[URI<EitherURI>], V>>({
  orElseEither: (fb) => (fa) =>
    fa._tag === "Right" ? E.right(E.left(fa.right)) : E.map_(fb(), E.right)
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<EitherURI>], V>>(
  {
    flatten: E.flatten
  }
)

export const Covariant = P.instance<P.Covariant<[URI<EitherURI>], V>>({
  map: E.map
})

export const Applicative = P.instance<P.Applicative<[URI<EitherURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[URI<EitherURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Fail = P.instance<P.FX.Fail<[URI<EitherURI>], V>>({
  fail: E.left
})

export const Run = P.instance<P.FX.Run<[URI<EitherURI>], V>>({
  either: E.right
})

export const ForEach = P.instance<P.ForEach<[URI<EitherURI>], V>>({
  map: E.map,
  forEachF: E.forEachF
})

export const FoldMap = P.instance<P.FoldMap<[URI<EitherURI>], V>>({
  foldMap: E.foldMap
})

export const Reduce = P.instance<P.Reduce<[URI<EitherURI>], V>>({
  reduce: E.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[URI<EitherURI>], V>>({
  reduceRight: E.reduceRight
})

export const Foldable = P.instance<P.Foldable<[URI<EitherURI>], V>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
