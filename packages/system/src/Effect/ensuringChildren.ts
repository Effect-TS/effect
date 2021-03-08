// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import * as Fiber from "../Fiber"
import { pipe } from "../Function"
import { track } from "../Supervisor"
import { chain, supervised } from "./core"
import type { Effect, RIO } from "./effect"
import { ensuring } from "./ensuring"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @dataFirst ensuringChildren_
 * @trace 0
 */
export function ensuringChildren<R1, X>(
  children: (_: readonly Fiber.Runtime<any, any>[]) => RIO<R1, X>
) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R & R1, E, A> =>
    ensuringChildren_(fa, children)
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @trace 1
 */
export function ensuringChildren_<R, E, A, R1, X>(
  fa: Effect<R, E, A>,
  children: (_: readonly Fiber.Runtime<any, any>[]) => RIO<R1, X>
) {
  return pipe(
    track,
    chain((s) =>
      pipe(
        fa,
        supervised(s),
        ensuring(pipe(s.value, chain(traceAs(children, (v) => children(v)))))
      )
    )
  )
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 *
 * @trace 1
 */
export function ensuringChild_<R, E, A, R2, X>(
  fa: Effect<R, E, A>,
  f: (_: Fiber.Fiber<any, readonly any[]>) => RIO<R2, X>
) {
  return ensuringChildren_(
    fa,
    traceAs(f, (x) => pipe(x, Fiber.collectAll, f))
  )
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 *
 * @dataFirst ensuringChild_
 * @trace 0
 */
export function ensuringChild<R, E, A, R2, X>(
  f: (_: Fiber.Fiber<any, readonly any[]>) => RIO<R2, X>
) {
  return (fa: Effect<R, E, A>) => ensuringChild_(fa, f)
}
