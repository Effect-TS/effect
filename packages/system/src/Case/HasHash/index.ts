export const hashSym = Symbol()

export interface HasHash {
  readonly [hashSym]: () => number
}

export function hasHash(u: unknown): u is HasHash {
  return typeof u === "object" && u !== null && hashSym in u
}
