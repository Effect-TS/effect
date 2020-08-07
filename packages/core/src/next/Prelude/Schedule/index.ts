import { tuple } from "../../../Function"
import * as S from "../../Schedule"
import { Applicative4 } from "../abstract/Applicative"
import { Contravariant4 } from "../abstract/Contravariant"
import { Covariant4 } from "../abstract/Covariant"

/**
 * @category definitions
 */

export const ScheduleInURI = "ScheduleIn"
export type ScheduleInURI = typeof ScheduleInURI

export const ScheduleURI = "Schedule"
export type ScheduleURI = typeof ScheduleURI

declare module "../abstract/HKT" {
  interface URItoKind4<S, R, E, A> {
    [ScheduleInURI]: S.Schedule<S, R, A, E>
    [ScheduleURI]: S.Schedule<S, R, E, A>
  }
}

/**
 * @category instances
 */

export const ContravariantIn: Contravariant4<ScheduleInURI> = {
  URI: ScheduleInURI,
  contramap: S.contramap
}

export const Covariant: Covariant4<ScheduleURI> = {
  URI: ScheduleURI,
  map: S.map
}

export const Applicative: Applicative4<ScheduleURI> = {
  URI: ScheduleURI,
  map: S.map,
  any: () => S.succeed({}),
  both: (fb) => (fa) => S.contramap_(S.both_(fa, fb), (e) => tuple(e, e))
}

/**
 * @category api
 */

export { succeed, tapOutput, run, delayed } from "../../Schedule"
