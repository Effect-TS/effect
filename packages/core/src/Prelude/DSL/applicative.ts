// ets_tracing: off

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import { pipe } from "@effect-ts/system/Function"

import type { Applicative } from "../Applicative/index.js"
import * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"
import { chainF } from "./chain.js"

export function getApplicativeF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): Applicative<F, C>
export function getApplicativeF<F>(F: Monad<HKT.UHKT2<F>>): Applicative<HKT.UHKT2<F>> {
  const chain = chainF(F)
  return HKT.instance<Applicative<HKT.UHKT2<F>>>({
    any: F.any,
    map: F.map,
    both: (fb) => (fa) =>
      pipe(
        fb,
        chain((a) =>
          pipe(
            fa,
            F.map((b) => Tp.tuple(b, a))
          )
        )
      )
  })
}
