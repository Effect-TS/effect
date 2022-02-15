import type * as TypeClasses from "../../../prelude/TypeClasses"
import type { EffectF } from "../definition"
import { Effect } from "../definition"

/**
 * @tsplus static ets/EffectOps Applicative
 */
export const Applicative: TypeClasses.Applicative<EffectF> = {
  ap: (fa) => (fab) => fab.flatMap((f) => fa.map((a) => f(a))),
  map: (f) => (fa) => fa.map(f),
  of: (a) => Effect.succeed(a)
}
