import { succeed } from "../_internal/managed"
import * as Pull from "../Pull"
import type { UIO } from "./definitions"
import { Stream } from "./definitions"

/**
 * The empty stream
 */
export const empty: UIO<never> = new Stream(succeed(Pull.end))
