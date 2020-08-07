import { tuple } from "../../../Function"
import * as S from "../../Schedule"
import { intersect } from "../Utils"
import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeContravariantInput } from "../abstract/ContravariantInput"
import { makeCovariant } from "../abstract/Covariant"

/**
 * @category definitions
 */

export const ScheduleInURI = "ScheduleIn"
export type ScheduleInURI = typeof ScheduleInURI

export const ScheduleURI = "Schedule"
export type ScheduleURI = typeof ScheduleURI

declare module "../abstract/HKT" {
  interface URItoKind6<X, In, St, Env, Err, Out> {
    [ScheduleURI]: S.Schedule<X, Env, In, Out>
  }
}

/**
 * @category instances
 */

export const ContravariantInput = makeContravariantInput(ScheduleURI)({
  contramapInput: S.contramap
})

export const Covariant = makeCovariant(ScheduleURI)({
  map: S.map
})

export const Any = makeAny(ScheduleURI)({
  any: () => S.succeed({})
})

export const AssociativeBoth = makeAssociativeBoth(ScheduleURI)({
  both: (fb) => (fa) => S.contramap_(S.both_(fa, fb), (e) => tuple(e, e))
})

export const Applicative = makeApplicative(ScheduleURI)(
  intersect(Covariant, Any, AssociativeBoth)
)

/**
 * @category api
 */

export { delayed, run, succeed, tapOutput } from "../../Schedule"
