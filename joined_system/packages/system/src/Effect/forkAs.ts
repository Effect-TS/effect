import * as Fiber from "../Fiber"
import * as FR from "../FiberRef"
import { pipe } from "../Function"
import * as O from "../Option"
import { chain, fork } from "./core"
import type { Effect, RIO } from "./effect"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs(name: string) {
  return <R, E, A>(self: Effect<R, E, A>): RIO<R, Fiber.FiberContext<E, A>> =>
    forkAs_(self, name)
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs_<R, E, A>(
  self: Effect<R, E, A>,
  name: string
): RIO<R, Fiber.FiberContext<E, A>> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      Fiber.fiberName,
      FR.set(O.some(name)),
      chain(() => fork(restore(self)))
    )
  )
}
