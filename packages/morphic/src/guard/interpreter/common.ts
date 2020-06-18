import type { Guard } from "../hkt"

import type { Monoid } from "@matechs/core/Monoid"

export const isUnknownRecord = (u: unknown): u is { [key: string]: unknown } => {
  const s = Object.prototype.toString.call(u)
  return s === "[object Object]" || s === "[object Window]"
}

export const isString = (u: unknown): u is string => typeof u === "string"

export const isNumber = (u: unknown): u is number => typeof u === "number"

export type AOfGuard<X extends Guard<any>> = X extends Guard<infer A> ? A : never

export function getOrGuard<A>(): Monoid<Guard<A>> {
  return {
    concat: (x, y) => ({ is: (u: unknown): u is A => x.is(u) || y.is(u) }),
    empty: { is: (u: unknown): u is A => false }
  }
}
