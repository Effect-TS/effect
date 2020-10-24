import { pipe } from "../Function"
import type { Option } from "../Option"
import { getAndSet, makeRef } from "../Ref"
import type { Effect, UIO } from "./effect"
import { map } from "./map"
import { whenM_ } from "./whenM"

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 */
export function once<R, E, A>(self: Effect<R, E, A>): UIO<Effect<R, E, Option<A>>> {
  return pipe(
    makeRef(true),
    map((r) => whenM_(self, getAndSet(false)(r)))
  )
}
