// forked from https://github.com/planttheidea/fast-equals

import type { HasHash } from "../HasHash"
import { hash, hasHash } from "../HasHash"
import { createComparator } from "./comparator"
import { createCircularEqualCreator, sameValueZeroEqual } from "./utils"

export const equalsSym = Symbol()

export interface HasEquals extends HasHash {
  readonly [equalsSym]: (other: unknown) => boolean
}

export function hasEquals(u: unknown): u is HasEquals {
  return hasHash(u) && equalsSym in u
}

export const deepEquals = createComparator(
  createCircularEqualCreator((eq) => (a, b, meta) => {
    if (hasEquals(a)) {
      return a[equalsSym](b)
    } else {
      return eq(a, b, meta)
    }
  })
)

export function equals(a: unknown, b: unknown): boolean {
  if (!sameValueZeroEqual(hash(a), hash(b))) {
    return false
  } else if (hasEquals(a)) {
    return a[equalsSym](b)
  } else if (hasEquals(b)) {
    return b[equalsSym](a)
  }
  return sameValueZeroEqual(a, b)
}
