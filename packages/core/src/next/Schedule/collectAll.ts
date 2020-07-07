import { Effect } from "../Effect/effect"

import { doUntil, doUntilM } from "./doUntil"
import { doWhile, doWhileM } from "./doWhile"
import { fold_ } from "./fold"
import { id } from "./id"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that collects the outputs of this one into a list.
 */
export const collectFrom = <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
  fold_(self, [] as readonly B[], (z, b) => [b, ...z])

/**
 * Returns a new schedule that collects the outputs of this one into a list.
 */
export const collectAll = <A>() => collectFrom(id<A>())

/**
 * A schedule that recurs as long as the condition f holds, collecting all inputs into a list.
 */
export const collectWhile = <A>(f: (a: A) => boolean) => collectFrom(doWhile(f))

/**
 * A schedule that recurs as long as the effectful condition holds, collecting all inputs into a list.
 */
export const collectWhileM = <A, S, R>(f: (a: A) => Effect<S, R, never, boolean>) =>
  collectFrom(doWhileM(f))

/**
 * A schedule that recurs until the condition f holds, collecting all inputs into a list.
 */
export const collectUntil = <A>(f: (a: A) => boolean) => collectFrom(doUntil(f))

/**
 * A schedule that recurs until the effectful condition holds, collecting all inputs into a list.
 */
export const collectUntilM = <A, S, R>(f: (a: A) => Effect<S, R, never, boolean>) =>
  collectFrom(doUntilM(f))
