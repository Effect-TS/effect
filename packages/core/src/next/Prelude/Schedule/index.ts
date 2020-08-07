import { tuple } from "../../../Function"
import * as S from "../../Schedule"
import { Applicative4 } from "../abstract/Applicative"
import { Contravariant4 } from "../abstract/Contravariant"
import { Covariant4 } from "../abstract/Covariant"

/**
 * @category definitions
 */

export const ContravariantURI = "ContravariantSchedule"
export type ContravariantURI = typeof ContravariantURI

export const CovariantURI = "CovariantSchedule"
export type CovariantURI = typeof CovariantURI

export const ApplicativeURI = "ApplicativeSchedule"
export type ApplicativeURI = typeof ApplicativeURI

declare module "../abstract/HKT" {
  interface URItoKind4<S, R, E, A> {
    [ContravariantURI]: S.Schedule<S, R, A, E>
    [CovariantURI]: S.Schedule<S, R, E, A>
    [ApplicativeURI]: S.Schedule<S, R, E, A>
  }
}

/**
 * @category instances
 */

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

/**
 * @category api
 */

export { succeed, tapOutput, run, delayed } from "../../Schedule"
