import { pipe, tuple } from "@effect-ts/system/Function"

import type { Applicative } from "../Applicative"
import * as HKT from "../HKT"
import type { Monad } from "../Monad"
import { chainF } from "./dsl"

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
        fa,
        chain((a) =>
          pipe(
            fb,
            F.map((b) => tuple(a, b))
          )
        )
      )
  })
}
