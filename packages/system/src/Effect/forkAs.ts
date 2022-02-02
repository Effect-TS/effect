// ets_tracing: off

import * as Fiber from "../Fiber"
import * as FR from "../FiberRef"
import { pipe } from "../Function"
import * as O from "../Option"
import { fork } from "./core"
import type { Effect, RIO } from "./effect"
import { uninterruptibleMask } from "./interruption"
import * as zips from "./zips"

/**
 * Forks the effect into a new independent fiber, with the specified name.
 *
 * @ets_data_first forkAs_
 */
export function forkAs(name: string, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): RIO<R, Fiber.FiberContext<E, A>> =>
    forkAs_(self, name, __trace)
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs_<R, E, A>(
  self: Effect<R, E, A>,
  name: string,
  __trace?: string
): RIO<R, Fiber.FiberContext<E, A>> {
  return uninterruptibleMask(({ restore }) =>
    fork(
      pipe(FR.set_(Fiber.fiberName, O.some(name)), zips.zipRight(restore(self))),
      __trace
    )
  )
}
