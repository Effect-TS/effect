// ets_tracing: off

import type * as Chunk from "../Collections/Immutable/Chunk/index.js"
import type { SortedSet } from "../Collections/Immutable/SortedSet/index.js"
import * as Fiber from "../Fiber/index.js"
import { pipe } from "../Function/index.js"
import { track } from "../Supervisor/index.js"
import * as core from "./core.js"
import type { Effect, RIO } from "./effect.js"
import * as ensuring from "./ensuring.js"

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @ets_data_first ensuringChildren_
 */
export function ensuringChildren<R1, X>(
  children: (_: SortedSet<Fiber.Runtime<any, any>>) => RIO<R1, X>,
  __trace?: string
) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R & R1, E, A> =>
    ensuringChildren_(fa, children, __trace)
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 */
export function ensuringChildren_<R, E, A, R1, X>(
  fa: Effect<R, E, A>,
  children: (_: SortedSet<Fiber.Runtime<any, any>>) => RIO<R1, X>,
  __trace?: string
) {
  return pipe(
    track,
    core.chain((s) =>
      pipe(
        fa,
        core.supervised(s),
        ensuring.ensuring(pipe(s.value, core.chain(children)), __trace)
      )
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
  f: (_: Fiber.Fiber<any, Chunk.Chunk<unknown>>) => RIO<R2, X>,
  __trace?: string
) {
  return ensuringChildren_(fa, (x) => pipe(x, Fiber.collectAll, f), __trace)
}

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not
 * this effect succeeds.
 *
 * @ets_data_first ensuringChild_
 */
export function ensuringChild<R, E, A, R2, X>(
  f: (_: Fiber.Fiber<any, Chunk.Chunk<unknown>>) => RIO<R2, X>,
  __trace?: string
) {
  return (fa: Effect<R, E, A>) => ensuringChild_(fa, f, __trace)
}
