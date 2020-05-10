import { Lazy } from "fp-ts/lib/function"

import { Sync } from "../Support/Common/effect"

import { pure } from "./pure"
import { suspended } from "./suspended"

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */

export function sync<A>(thunk: Lazy<A>): Sync<A> {
  return suspended(() => pure(thunk()))
}
