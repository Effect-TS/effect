import { flow } from "../Function"
import * as O from "../Option"
import * as P from "../Prelude"

export function monad<F extends P.URIS, C>(
  M: P.Monad<F, C>
): P.Monad<P.AppendURI<F, O.OptionURI>, C>
export function monad<F>(M: P.Monad<P.UHKT<F>, P.Auto>) {
  const succeed = P.succeedF(M)
  return P.instance<P.Monad<P.AppendURI<P.UHKT<F>, O.OptionURI>, P.Auto>>({
    any: () => succeed(O.some({})),
    flatten: flow(
      M.map((o) => (o._tag === "None" ? succeed(O.none) : o.value)),
      M.flatten
    ),
    map: (f) => M.map(O.map(f))
  })
}

export function applicative<F extends P.URIS, C>(
  M: P.Applicative<F, C>
): P.Applicative<P.AppendURI<F, O.OptionURI>, C>
export function applicative<F>(M: P.Applicative<P.UHKT<F>, P.Auto>) {
  const succeed = P.succeedF(M)
  return P.instance<P.Applicative<P.AppendURI<P.UHKT<F>, O.OptionURI>, P.Auto>>({
    any: () => succeed(O.some({})),
    map: (f) => M.map(O.map(f)),
    both: (fb) =>
      flow(
        M.both(fb),
        M.map(([a, b]) => O.zip_(a, b))
      )
  })
}
