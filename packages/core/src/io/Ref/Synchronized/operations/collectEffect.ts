import { identity } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Maps and filters the `get` value of the `XRef.Synchronized` with the
 * specified effectual partial function, returning a `XRef.Synchronized`
 * with a `get` value that succeeds with the result of the partial function
 * if it is defined or else fails with `None`.
 *
 * @tsplus fluent ets/XSynchronized collectEffect
 */
export function collectEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  pf: (b: B) => Option<Effect<RC, EC, C>>
): XSynchronized<RA, RB & RC, EA, Option<EB | EC>, A, C> {
  return self.foldEffect(identity, Option.some, Effect.succeedNow, (b) =>
    pf(b).fold(Effect.failNow(Option.emptyOf<EB | EC>()), (_) => _.asSomeError())
  )
}

/**
 * Maps and filters the `get` value of the `XRef.Synchronized` with the
 * specified effectual partial function, returning a `XRef.Synchronized`
 * with a `get` value that succeeds with the result of the partial function
 * if it is defined or else fails with `None`.
 *
 * @ets_data_first collectEffect_
 */
export function collectEffect<RC, EC, B, C>(pf: (b: B) => Option<Effect<RC, EC, C>>) {
  ;<RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, Option<EB | EC>, A, C> => self.collectEffect(pf)
}
