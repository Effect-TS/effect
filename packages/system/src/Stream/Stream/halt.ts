// ets_tracing: off

import type * as C from "../../Cause/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import type { IO } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"

/**
 * The stream that always halts with `cause`.
 */
export const halt: <E>(cause: C.Cause<E>) => IO<E, never> = (x) =>
  pipe(x, T.halt, fromEffect)
