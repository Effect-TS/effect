import type * as C from "../../Cause"
import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import type { IO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that always halts with `cause`.
 */
export const halt: <E>(cause: C.Cause<E>) => IO<E, never> = (x) =>
  pipe(x, T.halt, fromEffect)
