// ets_tracing: off

import * as P from "../Prelude/index.js"
import * as EI from "./operations/index.js"

export interface EitherF extends P.HKT {
  readonly type: EI.Either<this["E"], this["A"]>
}

export interface EitherFixedLeftF<E> extends P.HKT {
  readonly type: P.Kind<EitherF, this["R"], E, this["A"]>
}

export const Any = P.instance<P.Any<EitherF>>({
  any: () => EI.right({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<EitherF>>({
  both: EI.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<EitherF>>({
  orElseEither: (fb) => (fa) =>
    fa._tag === "Right" ? EI.right(EI.left(fa.right)) : EI.map_(fb(), EI.right)
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<EitherF>>({
  flatten: EI.flatten
})

export const Covariant = P.instance<P.Covariant<EitherF>>({
  map: EI.map
})

export const Applicative = P.instance<P.Applicative<EitherF>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<EitherF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Fail = P.instance<P.FX.Fail<EitherF>>({
  fail: EI.left
})

export const Run = P.instance<P.FX.Run<EitherF>>({
  either: EI.right
})

export const ForEach = P.instance<P.ForEach<EitherF>>({
  map: EI.map,
  forEachF: EI.forEachF
})

export const FoldMap = P.instance<P.FoldMap<EitherF>>({
  foldMap: EI.foldMap
})

export const Reduce = P.instance<P.Reduce<EitherF>>({
  reduce: EI.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<EitherF>>({
  reduceRight: EI.reduceRight
})

export const Foldable = P.instance<P.Foldable<EitherF>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const ChainRec = P.instance<P.ChainRec<EitherF>>({
  chainRec:
    <A, B, E>(f: (a: A) => EI.Either<E, EI.Either<A, B>>) =>
    (a: A): EI.Either<E, B> =>
      P.tailRec<EI.Either<E, EI.Either<A, B>>, EI.Either<E, B>>(f(a), (e) =>
        EI.isLeft(e)
          ? EI.right(EI.left(e.left))
          : EI.isLeft(e.right)
          ? EI.left(f(e.right.left))
          : EI.right(EI.right(e.right.right))
      )
})
export const { chainRec } = ChainRec
