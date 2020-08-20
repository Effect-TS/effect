import * as E from "@effect-ts/system/Either"
import { pipe, tuple } from "@effect-ts/system/Function"

import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import type { Associative } from "../Associative"

export const EitherURI = "Either"

export type EitherURI = typeof EitherURI

export type V = P.V<"E", "+">

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [EitherURI]: E.Either<E, A>
  }
}

export const Any = P.instance<P.Any<EitherURI, V>>({
  any: () => E.right({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<EitherURI, V>>({
  both: E.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<EitherURI, V>>({
  either: (fb) => (fa) =>
    fa._tag === "Right"
      ? E.right(E.left(fa.right))
      : fb._tag === "Right"
      ? E.right(fb)
      : fb
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<EitherURI, V>>({
  flatten: E.flatten
})

export const Covariant = P.instance<P.Covariant<EitherURI, V>>({
  map: E.map
})

export const Applicative: P.Applicative<EitherURI, V> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const Monad: P.Monad<EitherURI, V> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

export const Fail = P.instance<P.FX.Fail<EitherURI, V>>({
  fail: E.left
})

export const Run = P.instance<P.FX.Run<EitherURI, V>>({
  run: E.right
})

export const getValidationApplicative = DSL.getValidationF({
  ...Monad,
  ...Fail,
  ...Applicative,
  ...Run
})

export function zipValidation<E>(
  A: Associative<E>
): <B>(fb: E.Either<E, B>) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]> {
  return (fb) =>
    E.fold(
      (ea) =>
        E.fold_(
          fb,
          (eb) => E.left(A.combine(eb)(ea)),
          () => E.left(ea)
        ),
      (a) => E.fold_(fb, E.left, (b) => E.right(tuple(a, b)))
    )
}

export const foreachF = P.implementForeachF<EitherURI, V>()((_) => (G) => (f) => (fa) =>
  E.isLeft(fa) ? DSL.succeedF(G)(fa) : pipe(f(fa.right), G.map(E.right))
)

export const Traversable = P.instance<P.Traversable<EitherURI, V>>({
  map: E.map,
  foreachF
})

export const sequenceS = DSL.sequenceSF(Applicative)

export {
  alt,
  alt_,
  ap,
  ap_,
  bimap,
  bimap_,
  chain,
  chain_,
  compact,
  duplicate,
  Either,
  exists,
  exists_,
  extend,
  extend_,
  filterOrElse,
  filterOrElse_,
  flatten,
  fold,
  fold_,
  fromNullable,
  fromNullable_,
  fromOption,
  fromOption_,
  fromPredicate,
  fromPredicate_,
  getOrElse,
  getOrElse_,
  isLeft,
  isRight,
  Left,
  left,
  map,
  mapLeft,
  mapLeft_,
  map_,
  merge,
  orElse,
  orElseEither,
  orElseEither_,
  orElse_,
  parseJSON,
  parseJSON_,
  Right,
  right,
  stringifyJSON,
  swap,
  tap,
  tap_,
  toError,
  tryCatch,
  tryCatch_,
  widenA,
  widenE,
  zip,
  zipFirst,
  zipFirst_,
  zipSecond,
  zipSecond_,
  zip_
} from "@effect-ts/system/Either"
