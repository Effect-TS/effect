import { makeAny } from "../abstract/Any"
import { makeCovariant } from "../abstract/Covariant"
import * as E from "../system/Either"

/**
 * Typelevel map entries
 */
export const EitherSuccessURI = "EitherSuccess"
export type EitherSuccessURI = typeof EitherSuccessURI

declare module "../abstract/HKT" {
  interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {
    [EitherSuccessURI]: E.Either<Err, Out>
  }
}

/**
 * The `Any` instance for `Either[+_, +_]`
 */
export const Any = makeAny(EitherSuccessURI)({
  any: () => E.right({})
})

/**
 * The `Covariant` instance for `Either[+_, +_]`
 */
export const Covariant = makeCovariant(EitherSuccessURI)({
  map: E.map
})
