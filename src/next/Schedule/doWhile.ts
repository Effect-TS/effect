import { Eq } from "../../Eq"
import { Effect } from "../Effect/effect"

import { id } from "./id"
import { whileInputM_, whileInput_ } from "./whileInput"

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export const doWhileM = <A, S, R>(f: (a: A) => Effect<S, R, never, boolean>) =>
  whileInputM_(id<A>(), f)

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export const doWhile = <A>(f: (a: A) => boolean) => whileInput_(id<A>(), f)

/**
 * A schedule that recurs for until the predicate is equal.
 */
export const doWhileEquals = <A>(a: A, eq?: Eq<A>) =>
  whileInput_(id<A>(), (b) => (eq ? eq.equals(a, b) : b === a))
