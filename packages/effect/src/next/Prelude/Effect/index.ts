import * as S from "../../Effect"
import { Contravariant4 } from "../Contravariant"
import { Covariant4 } from "../Covariant"
import { IdentityBoth4 } from "../IdentityBoth"

export const ContravariantURI = "ContravariantEffect"
export type ContravariantURI = typeof ContravariantURI

export const CovariantURI = "CovariantEffect"
export type CovariantURI = typeof CovariantURI

export const ApplicativeURI = "ApplicativeEffect"
export type ApplicativeURI = typeof ApplicativeURI

declare module "../HKT" {
  interface URItoKind4<S, R, E, A> {
    [ContravariantURI]: S.Effect<S, A, E, R>
    [CovariantURI]: S.Effect<S, R, E, A>
    [ApplicativeURI]: S.Effect<S, R, E, A>
  }
}

export const Contravariant: Contravariant4<ContravariantURI> = {
  URI: ContravariantURI,
  contramap: S.provideSome
}

export const Covariant: Covariant4<CovariantURI> = {
  URI: CovariantURI,
  map: S.map
}

export const Applicative: IdentityBoth4<ApplicativeURI> & Covariant4<ApplicativeURI> = {
  URI: ApplicativeURI,
  any: <S, R, E, A>() => S.succeed<unknown>(undefined) as S.Effect<S, R, E, A>,
  both: S.zip,
  map: S.map
}

export { succeed, effectTotal, chain, runMain } from "../../Effect"
