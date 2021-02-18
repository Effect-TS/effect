import { instance } from "../Prelude"
import type { Inverse } from "./index"

export function makeInverse<A>(
  identity: A,
  combine: (y: A) => (x: A) => A,
  inverse: (r: A) => (l: A) => A
): Inverse<A> {
  return instance({
    combine,
    identity,
    inverse
  })
}
