import { Eq } from "../../Eq"
import { Effect } from "../Effect/effect"

import { id } from "./id"
import { untilInputM_, untilInput_ } from "./untilInput"

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export const doUntilM = <A, S, R>(f: (a: A) => Effect<S, R, never, boolean>) =>
  untilInputM_(id<A>(), f)

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export const doUntil = <A>(f: (a: A) => boolean) => untilInput_(id<A>(), f)

/**
 * A schedule that recurs for until the predicate is equal.
 */
export const doUntilEquals = <A>(a: A, eq?: Eq<A>) =>
  untilInput_(id<A>(), (b) => (eq ? eq.equals(a, b) : b === a))
