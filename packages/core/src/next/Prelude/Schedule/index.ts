import * as S from "../../Schedule"
import { Contravariant4 } from "../Contravariant"
import { Covariant4 } from "../Covariant"

export const ContravariantURI = "ContravariantSchedule"
export type ContravariantURI = typeof ContravariantURI

export const CovariantURI = "CovariantSchedule"
export type CovariantURI = typeof CovariantURI

declare module "../HKT" {
  interface URItoKind4<S, R, E, A> {
    [ContravariantURI]: S.Schedule<S, R, A, E>
    [CovariantURI]: S.Schedule<S, R, E, A>
  }
}

export const Contravariant: Contravariant4<ContravariantURI> = {
  URI: ContravariantURI,
  contramap: S.contramap
}

export const Covariant: Covariant4<CovariantURI> = {
  URI: CovariantURI,
  map: S.map
}
