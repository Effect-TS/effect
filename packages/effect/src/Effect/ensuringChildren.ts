import type * as Fiber from "../Fiber"
import { pipe } from "../Function"
import { track } from "../Supervisor"
import { chain } from "./core"
import type { AsyncRE, Effect } from "./effect"
import { ensuring } from "./ensuring"
import { supervised } from "./supervised"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren<S1, R1>(
  children: (_: readonly Fiber.Runtime<any, any>[]) => Effect<S1, R1, never, any>
) {
  return <S, R, E, A>(fa: Effect<S, R, E, A>): AsyncRE<R & R1, E, A> =>
    ensuringChildren_(fa, children)
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren_<S, R, E, A, S1, R1>(
  fa: Effect<S, R, E, A>,
  children: (_: readonly Fiber.Runtime<any, any>[]) => Effect<S1, R1, never, any>
) {
  return pipe(
    track,
    chain((s) =>
      pipe(
        fa,
        supervised(s),
        ensuring(
          pipe(
            s.value,
            chain((v) => children(v))
          )
        )
      )
    )
  )
}
