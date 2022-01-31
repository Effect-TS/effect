// ets_tracing: off

import { instance } from "../Prelude/index.js"
import type { Inverse } from "./index.js"

export function makeInverse<A>(
  identity: A,
  combine: (x: A, y: A) => A,
  inverse: (x: A, y: A) => A
): Inverse<A> {
  return instance({
    combine,
    identity,
    inverse
  })
}
