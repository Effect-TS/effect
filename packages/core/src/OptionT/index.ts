import { flow } from "../Function"
import * as O from "../Option"
import type { Applicative, Monad } from "../Prelude"
import { succeedF } from "../Prelude/DSL"
import * as HKT from "../Prelude/HKT"

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<[F[0], ...HKT.Rest<F>, HKT.URI<O.OptionURI>], C>
export function monad<F, C>(
  M: Monad<HKT.UHKT<F>, C>
): Monad<[HKT.UHKT<F>[0], HKT.URI<O.OptionURI>], C> {
  const succeed = succeedF(M)
  return HKT.instance<Monad<[HKT.UHKT<F>[0], HKT.URI<O.OptionURI>], C>>({
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
): Applicative<[F[0], ...HKT.Rest<F>, HKT.URI<O.OptionURI>], C>
export function applicative<F, C>(
  M: Applicative<HKT.UHKT<F>, C>
): Applicative<[HKT.UHKT<F>[0], HKT.URI<O.OptionURI>], C> {
  const succeed = succeedF(M)
  return HKT.instance<Applicative<[HKT.UHKT<F>[0], HKT.URI<O.OptionURI>], C>>({
    any: () => succeed(O.some({})),
    map: (f) => M.map(O.map(f)),
    both: (fb) =>
      flow(
        M.both(fb),
        M.map(([a, b]) => O.zip_(a, b))
      )
  })
}
