// tracing: off

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
 */
export function ensuringChildren<R1, X>(
  children: (_: readonly Fiber.Runtime<any, any>[]) => RIO<R1, X>,
  __trace?: string
) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R & R1, E, A> =>
    ensuringChildren_(fa, children)
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren_<R, E, A, R1, X>(
  fa: Effect<R, E, A>,
  children: (_: readonly Fiber.Runtime<any, any>[]) => RIO<R1, X>,
  __trace?: string
) {
  return pipe(
    track,
    chain((s) =>
      pipe(fa, supervised(s), ensuring(pipe(s.value, chain(children, __trace))))
    )
  )
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 */
export function ensuringChild_<R, E, A, R2, X>(
  fa: Effect<R, E, A>,
  f: (_: Fiber.Fiber<any, readonly any[]>) => RIO<R2, X>,
  __trace?: string
) {
  return ensuringChildren_(fa, (x) => pipe(x, Fiber.collectAll, f), __trace)
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 *
 * @dataFirst ensuringChild_
 */
export function ensuringChild<R, E, A, R2, X>(
  f: (_: Fiber.Fiber<any, readonly any[]>) => RIO<R2, X>,
  __trace?: string
) {
  return (fa: Effect<R, E, A>) => ensuringChild_(fa, f, __trace)
}
