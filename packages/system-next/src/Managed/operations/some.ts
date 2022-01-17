import * as O from "../../Option"
import type { Managed } from "../definition"
import { succeed } from "./succeed"

/**
 * Returns a `Managed` with the optional value.
 */
export function some<A>(
  value: A,
  __trace?: string
): Managed<unknown, never, O.Option<A>> {
  return succeed(() => O.some(value), __trace)
}
