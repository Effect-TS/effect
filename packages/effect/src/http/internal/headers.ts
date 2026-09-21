/**
 * @unstable
 */
import type { Mutable } from "../../Types.ts"
import * as Headers from "../Headers.ts"

const Proto = Object.getPrototypeOf(Headers.empty)

/**
 * @internal
 * @unstable
 */
export const emptyMutableUnsafe = (): Mutable<Headers.Headers> => Object.create(Proto)
