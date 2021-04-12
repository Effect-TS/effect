// forked from https://github.com/planttheidea/fast-equals

import { createComparator } from "./comparator"
import { createCircularEqualCreator } from "./utils"

export const equalsSym = Symbol()

export interface HasEquals {
  readonly [equalsSym]: (other: unknown) => boolean
}

export function hasEquals(u: unknown): u is HasEquals {
  return typeof u === "object" && u !== null && equalsSym in u
}

export const equals = createComparator(
  createCircularEqualCreator((eq) => (a, b, meta) => {
    if (hasEquals(a)) {
      return a[equalsSym](b)
    } else {
      return eq(a, b, meta)
    }
  })
)
