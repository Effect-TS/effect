import type { Guard } from "../base"

export const isUnknownRecord = (u: unknown): u is { [key: string]: unknown } => {
  const s = Object.prototype.toString.call(u)
  return s === "[object Object]" || s === "[object Window]"
}

export const isString = (u: unknown): u is string => typeof u === "string"

export const isNumber = (u: unknown): u is number => typeof u === "number"

export type AOfGuard<X extends Guard<any>> = X extends Guard<infer A> ? A : never
