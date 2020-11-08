import { flow } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import * as HKT from "../../Prelude/HKT"
import * as O from "../Option"

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<HKT.AppendURI<F, O.OptionURI>, C>
export function monad<F>(M: Monad<HKT.UHKT<F>, HKT.Auto>) {
  const succeed = succeedF(M)
  return HKT.instance<Monad<HKT.AppendURI<HKT.UHKT<F>, O.OptionURI>, HKT.Auto>>({
    any: () => succeed(O.some({})),
    flatten: flow(
      M.map((o) => (o._tag === "None" ? succeed(O.none) : o.value)),
      M.flatten
    ),
    map: (f) => M.map(O.map(f))
  })
}

export function applicative<F extends HKT.URIS, C>(
  M: Applicative<F, C>
): Applicative<HKT.AppendURI<F, O.OptionURI>, C>
export function applicative<F>(M: Applicative<HKT.UHKT<F>, HKT.Auto>) {
  const succeed = succeedF(M)
  return HKT.instance<Applicative<HKT.AppendURI<HKT.UHKT<F>, O.OptionURI>, HKT.Auto>>({
    any: () => succeed(O.some({})),
    map: (f) => M.map(O.map(f)),
    both: (fb) =>
      flow(
        M.both(fb),
        M.map(([a, b]) => O.zip_(a, b))
      )
  })
}
