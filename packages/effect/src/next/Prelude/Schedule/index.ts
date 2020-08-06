import { tuple } from "../../../Function"
import * as S from "../../Schedule"
import { Applicative4 } from "../Applicative"
import { Contravariant4 } from "../Contravariant"
import { Covariant4 } from "../Covariant"

export const ContravariantURI = "ContravariantSchedule"
export type ContravariantURI = typeof ContravariantURI

export const CovariantURI = "CovariantSchedule"
export type CovariantURI = typeof CovariantURI

export const ApplicativeURI = "ApplicativeSchedule"
export type ApplicativeURI = typeof ApplicativeURI

declare module "../HKT" {
  interface URItoKind4<S, R, E, A> {
    [ContravariantURI]: S.Schedule<S, R, A, E>
    [CovariantURI]: S.Schedule<S, R, E, A>
    [ApplicativeURI]: S.Schedule<S, R, E, A>
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

export const Applicative: Applicative4<ApplicativeURI> = {
  URI: ApplicativeURI,
  map: S.map,
  any: () => S.succeed({}),
  both: (fb) => (fa) => S.contramap_(S.both_(fa, fb), (e) => tuple(e, e))
}

export { succeed, tapOutput, run, delayed } from "../../Schedule"
