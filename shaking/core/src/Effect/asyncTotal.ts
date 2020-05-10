import { right } from "fp-ts/lib/Either"
import { FunctionN } from "fp-ts/lib/function"

import { AsyncCancelContFn } from "../Support/Common"
import { Async } from "../Support/Common/effect"

import { async } from "./async"

/**
 * Wrap an impure callback in IO
 *
 * This is a variant of async where the effect cannot fail with a checked exception.
 * @param op
 */
export function asyncTotal<A>(
  op: FunctionN<[FunctionN<[A], void>], AsyncCancelContFn>
): Async<A> {
  return async((callback) => op((a) => callback(right(a))))
}
