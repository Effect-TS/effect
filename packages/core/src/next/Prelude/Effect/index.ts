import * as S from "../../Effect"
import { Applicative4 } from "../Applicative"
import { Contravariant4 } from "../Contravariant"
import { Covariant4 } from "../Covariant"

export const EffectEnvURI = "EffectEnv"
export type EffectEnvURI = typeof EffectEnvURI

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI

declare module "../HKT" {
  interface URItoKind4<S, R, E, A> {
    [EffectEnvURI]: S.Effect<S, A, E, R>
    [EffectURI]: S.Effect<S, R, E, A>
  }
}

export const ContravariantEnv: Contravariant4<EffectEnvURI> = {
  URI: EffectEnvURI,
  contramap: S.provideSome
}

export const Covariant: Covariant4<EffectURI> = {
  URI: EffectURI,
  map: S.map
}

export const Applicative: Applicative4<EffectURI> = {
  URI: EffectURI,
  any: () => S.of,
  both: S.zip,
  map: S.map
}

export { chain, effectTotal, runMain, succeed } from "../../Effect"
