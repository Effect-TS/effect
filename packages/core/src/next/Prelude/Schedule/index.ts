import { tuple } from "../../../Function"
import * as S from "../../Schedule"
import { Any4 } from "../abstract/Any"
import { Applicative4 } from "../abstract/Applicative"
import { AssociativeBoth4 } from "../abstract/AssociativeBoth"
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
  Contravariant: "Contravariant",
  contramap: S.contramap
}

export const Covariant: Covariant4<ScheduleURI> = {
  URI: ScheduleURI,
  Covariant: "Covariant",
  map: S.map
}

export const Any: Any4<ScheduleURI> = {
  URI: ScheduleURI,
  Any: "Any",
  any: () => S.succeed({})
}

export const AssociativeBoth: AssociativeBoth4<ScheduleURI> = {
  URI: ScheduleURI,
  AssociativeBoth: "AssociativeBoth",
  both: (fb) => (fa) => S.contramap_(S.both_(fa, fb), (e) => tuple(e, e))
}

export const Applicative: Applicative4<ScheduleURI> = {
  ...Covariant,
  ...Any,
  ...AssociativeBoth
}

/**
 * @category api
 */

export { succeed, tapOutput, run, delayed } from "../../Schedule"
