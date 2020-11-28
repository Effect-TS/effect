import type * as Ex from "../../Exit"
import * as T from "../_internal/effect"
import type { IO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that ends with the `Exit` value `exit`.
 */
export function done<E, A>(exit: Ex.Exit<E, A>): IO<E, A> {
  return fromEffect(T.done(exit))
}
