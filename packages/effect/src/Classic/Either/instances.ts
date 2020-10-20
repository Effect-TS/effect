import type { EitherURI } from "../../Modules"
import * as P from "../../Prelude"
import type { V } from "./definition"
import * as E from "./operations"

export const Any = P.instance<P.Any<[EitherURI], V>>({
  any: () => E.right({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[EitherURI], V>>({
  both: E.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[EitherURI], V>>({
  or: (fb) => (fa) =>
    fa._tag === "Right"
      ? E.right(E.left(fa.right))
      : fb._tag === "Right"
      ? E.right(fb)
      : fb
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[EitherURI], V>>({
  flatten: E.flatten
})

export const Covariant = P.instance<P.Covariant<[EitherURI], V>>({
  map: E.map
})

export const Applicative = P.instance<P.Applicative<[EitherURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[EitherURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Fail = P.instance<P.FX.Fail<[EitherURI], V>>({
  fail: E.left
})

export const Run = P.instance<P.FX.Run<[EitherURI], V>>({
  either: E.right
})

export const Traversable = P.instance<P.Traversable<[EitherURI], V>>({
  map: E.map,
  foreachF: E.foreachF
})

export const FoldMap = P.instance<P.FoldMap<[EitherURI], V>>({
  foldMap: E.foldMap
})

export const Reduce = P.instance<P.Reduce<[EitherURI], V>>({
  reduce: E.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[EitherURI], V>>({
  reduceRight: E.reduceRight
})

export const Foldable = P.instance<P.Foldable<[EitherURI], V>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
