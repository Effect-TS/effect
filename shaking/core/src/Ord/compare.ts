import type { Ordering } from "fp-ts/lib/Ordering"

export const compare = (x: any, y: any): Ordering => {
  return x < y ? -1 : x > y ? 1 : 0
}
