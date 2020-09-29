import type { Cause } from "../../Cause"
import { halt as haltEff } from "../../Effect/core"
import { flow } from "../../Function"
import type { IO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that always halts with `cause`.
 */
export const halt: <E>(cause: Cause<E>) => IO<E, never> = flow(haltEff, fromEffect)
