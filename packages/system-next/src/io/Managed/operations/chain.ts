import * as Tp from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { zipRight_ as exitZipRight_ } from "../../Exit/operations/zipRight"
import { Managed } from "../definition"

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @ets fluent ets/Managed flatMap
 */
export function chain_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R2, E | E2, A2> {
  return Managed<R & R2, E | E2, A2>(
    self.effect.flatMap(({ tuple: [releaseSelf, a] }) =>
      f(a).effect.map(({ tuple: [releaseThat, b] }) =>
        Tp.tuple(
          (e) =>
            releaseThat(e)
              .exit()
              .flatMap((e1) =>
                releaseSelf(e)
                  .exit()
                  .flatMap((e2) => Effect.done(exitZipRight_(e1, e2)))
              ),
          b
        )
      )
    )
  )
}

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @ets_data_first chain_
 */
export function chain<A, R2, E2, A2>(
  f: (a: A) => Managed<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, A2> => chain_(self, f)
}
