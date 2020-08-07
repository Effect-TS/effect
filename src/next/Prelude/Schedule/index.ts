import { tuple } from "../../../Function"
import * as S from "../../Schedule"
import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { AssociativeBoth4, makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeContravariant } from "../abstract/Contravariant"
import { makeCovariant } from "../abstract/Covariant"

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

export const ContravariantIn = makeContravariant(ScheduleInURI)({
  contramap: S.contramap
})

export const Covariant = makeCovariant(ScheduleURI)({
  map: S.map
})

export const Any = makeAny(ScheduleURI)({
  any: () => S.succeed({})
})

export const AssociativeBoth: AssociativeBoth4<ScheduleURI> = makeAssociativeBoth(
  ScheduleURI
)({
  both: (fb) => (fa) => S.contramap_(S.both_(fa, fb), (e) => tuple(e, e))
})

export const Applicative = makeApplicative(ScheduleURI)({
  ...Covariant,
  ...Any,
  ...AssociativeBoth
})

/**
 * @category api
 */

export { delayed, run, succeed, tapOutput } from "../../Schedule"
