import { never as neverEffect } from "../../Effect/operations/never"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Returns a `Managed` that never acquires a resource.
 */
export const never: Managed<unknown, never, never> = fromEffect(neverEffect)
