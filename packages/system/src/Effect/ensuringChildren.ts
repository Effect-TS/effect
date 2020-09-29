import * as Fiber from "../Fiber"
import { flow, pipe } from "../Function"
import { track } from "../Supervisor"
import { chain } from "./core"
import type { Effect, RIO } from "./effect"
import { ensuring } from "./ensuring"
import { supervised } from "./supervised"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren<R1>(
  children: (_: readonly Fiber.Runtime<any, any>[]) => RIO<R1, any>
) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R & R1, E, A> =>
    ensuringChildren_(fa, children)
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren_<R, E, A, R1>(
  fa: Effect<R, E, A>,
  children: (_: readonly Fiber.Runtime<any, any>[]) => RIO<R1, any>
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
export function ensuringChild_<R, E, A, R2>(
  fa: Effect<R, E, A>,
  f: (_: Fiber.Fiber<any, Iterable<any>>) => RIO<R2, any>
) {
  return ensuringChildren_(fa, flow(Fiber.collectAll, f))
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 */
export function ensuringChild<S, R, E, A, R2>(
  f: (_: Fiber.Fiber<any, Iterable<any>>) => RIO<R2, any>
) {
  return (fa: Effect<R, E, A>) => ensuringChild_(fa, f)
}
