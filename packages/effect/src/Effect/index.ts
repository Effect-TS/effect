import * as C from "@effect-ts/system/Cause"
import * as T from "@effect-ts/system/Effect"
import * as E from "@effect-ts/system/Either"
import * as O from "@effect-ts/system/Option"

import { pipe } from "../Function"
import type { EffectCategoryURI, EffectURI } from "../Modules"
import * as P from "../Prelude"
import * as DSL from "../Prelude/DSL"

export * from "@effect-ts/system/Effect"
export { EffectURI } from "../Modules"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Any = P.instance<P.Any<[EffectURI], V>>({
  any: () => T.succeed({})
})

export class NoneError {
  readonly _tag = "NoneError"
}

export const None = P.instance<P.None<[EffectURI], V>>({
  never: () => T.die(new NoneError())
})

export const AssociativeEither = P.instance<P.AssociativeEither<[EffectURI], V>>({
  either: (fb) => (fa) =>
    T.foldCauseM_(
      fa,
      (c) =>
        pipe(
          c,
          C.find((x) =>
            x._tag === "Die" && x.value instanceof NoneError ? O.some(x.value) : O.none
          ),
          O.fold(
            () => T.orElseEither_(T.halt(c), fb),
            () => T.map_(fb, E.right)
          )
        ),
      (a) => T.succeed(E.left(a))
    )
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[EffectURI], V>>({
  flatten: T.flatten
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[EffectURI], V>>({
  both: T.zip
})

export const Covariant = P.instance<P.Covariant<[EffectURI], V>>({
  map: T.map
})

export const IdentityEither = P.instance<P.IdentityEither<[EffectURI], V>>({
  ...AssociativeEither,
  ...None
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[EffectURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<[EffectURI], V>>({
  ...Any,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[EffectURI], V>>({
  ...IdentityFlatten,
  ...Covariant
})

export const Applicative = P.instance<P.Applicative<[EffectURI], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const Fail = P.instance<P.FX.Fail<[EffectURI], V>>({
  fail: T.fail
})

export const Run = P.instance<P.FX.Run<[EffectURI], V>>({
  either: T.either
})

export const getValidationApplicative = DSL.getValidationF<[EffectURI], V>({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

export const Category = P.instance<P.Category<[EffectCategoryURI], V>>({
  id: T.environment,
  compose: T.compose
})
