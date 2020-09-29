import { die as die_ } from "../../Effect/die"
import type { UIO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that dies with the error.
 */
export const die = (e: unknown): UIO<never> => fromEffect(die_(e))
