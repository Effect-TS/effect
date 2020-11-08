import { pipe } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import * as HKT from "../../Prelude/HKT"
import * as O from "../Option"

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<HKT.AppendURI<F, O.OptionURI>, C>
export function monad<F>(M: Monad<HKT.UHKT<F>, HKT.Auto>) {
  return HKT.instance<Monad<HKT.AppendURI<HKT.UHKT<F>, O.OptionURI>, HKT.Auto>>({
    any: () => succeedF(M)(O.some({})),
    flatten: (ffa) =>
      pipe(
        ffa,
        M.map((o) => (o._tag === "None" ? succeedF(M)(O.none) : o.value)),
        M.flatten
      ),
    map: (f) => M.map(O.map(f))
  })
}

export function applicative<F extends HKT.URIS, C>(
  M: Applicative<F, C>
): Applicative<HKT.AppendURI<F, O.OptionURI>, C>
export function applicative<F>(M: Applicative<HKT.UHKT<F>, HKT.Auto>) {
  return HKT.instance<Applicative<HKT.AppendURI<HKT.UHKT<F>, O.OptionURI>, HKT.Auto>>({
    any: () => succeedF(M)(O.some({})),
    map: (f) => M.map(O.map(f)),
    both: (fb) => (fa) =>
      pipe(
        M.both(fb)(fa),
        M.map(([a, b]) => O.zip_(a, b))
      )
  })
}
