// ets_tracing: off

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import { pipe } from "@effect-ts/system/Function"

import type { Applicative } from "../Applicative/index.js"
import * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"
import { chainF } from "./chain.js"

export function getApplicativeF<F extends HKT.HKT>(F_: Monad<F>): Applicative<F> {
  const chain = chainF(F_)
  return HKT.instance<Applicative<F>>({
    any: F_.any,
    map: F_.map,
    both: (fb) => (fa) =>
      pipe(
        fb,
        chain((a) =>
          pipe(
            fa,
            F_.map((b) => Tp.tuple(b, a))
          )
        )
      )
  })
}
