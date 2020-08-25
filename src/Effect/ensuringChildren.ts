import * as Fiber from "../Fiber"
import { flow, pipe } from "../Function"
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

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 */
export function ensuringChild_<S, R, E, A, R2, S2>(
  fa: Effect<S, R, E, A>,
  f: (_: Fiber.Fiber<any, Iterable<any>>) => Effect<S2, R2, never, any>
) {
  return ensuringChildren_(fa, flow(Fiber.collectAll, f))
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 */
export function ensuringChild<S, R, E, A, R2, S2>(
  f: (_: Fiber.Fiber<any, Iterable<any>>) => Effect<S2, R2, never, any>
) {
  return (fa: Effect<S, R, E, A>) => ensuringChild_(fa, f)
}
