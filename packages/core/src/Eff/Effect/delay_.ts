import { chain_ } from "./chain_"
import { Effect, AsyncRE } from "./effect"
import { effectAsyncInterrupt } from "./effectAsyncInterrupt"
import { effectTotal } from "./effectTotal"
import { unit } from "./unit"

/**
 * Delay the effect of n milliseconds
 */
export const delay_ = <S, R, E, A>(
  effect: Effect<S, R, E, A>,
  n: number
): AsyncRE<R, E, A> =>
  chain_(
    effectAsyncInterrupt<unknown, never, void>((cb) => {
      const timer = setTimeout(() => {
        cb(unit)
      }, n)

      return effectTotal(() => {
        clearTimeout(timer)
      })
    }),
    () => effect
  )
