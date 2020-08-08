import * as S from "../../Schedule"
import { intersect } from "../Utils"
import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeContravariant } from "../abstract/Contravariant"
import { makeCovariant } from "../abstract/Covariant"

/**
 * @category definitions
 */

export const ScheduleInputURI = "ScheduleInput"
export type ScheduleInputURI = typeof ScheduleInputURI

export const ScheduleURI = "Schedule"
export type ScheduleURI = typeof ScheduleURI

declare module "../abstract/HKT" {
  interface URItoKind<X, In, St, Env, Err, Out> {
    [ScheduleURI]: S.Schedule<X, Env, In, Out>
    [ScheduleInputURI]: S.Schedule<X, Env, Out, In>
  }
}

/**
 * @category instances
 */

export const Contravariant = makeContravariant(ScheduleInputURI)({
  contramap: S.contramap
})

export const Covariant = makeCovariant(ScheduleURI)({
  map: S.map
})

export const Any = makeAny(ScheduleURI)({
  any: () => S.succeed({})
})

export const AssociativeBoth = makeAssociativeBoth(ScheduleURI)({
  both: S.both
})

export const Applicative = makeApplicative(ScheduleURI)(
  intersect(Covariant, Any, AssociativeBoth)
)

/**
 * @category api
 */

export { delayed, run, succeed, tapOutput } from "../../Schedule"
