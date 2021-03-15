export const equalsSym = Symbol()

export interface HasEquals {
  readonly [equalsSym]: (other: unknown) => boolean
}

export function hasEquals(u: unknown): u is HasEquals {
  return typeof u === "object" && u !== null && equalsSym in u
}
