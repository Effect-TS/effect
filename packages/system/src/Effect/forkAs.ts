import * as Fiber from "../Fiber"
import * as FR from "../FiberRef"
import { pipe } from "../Function"
import * as O from "../Option"
import type { AsyncR, Effect } from "."
import { chain, fork } from "./core"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs(name: string) {
  return <S, R, E, A>(self: Effect<S, R, E, A>): AsyncR<R, Fiber.FiberContext<E, A>> =>
    forkAs_(self, name)
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs_<S, R, E, A>(
  self: Effect<S, R, E, A>,
  name: string
): AsyncR<R, Fiber.FiberContext<E, A>> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      Fiber.fiberName,
      FR.set(O.some(name)),
      chain(() => fork(restore(self)))
    )
  )
}
